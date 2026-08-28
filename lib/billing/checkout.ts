import 'server-only'

import crypto from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { planPrice, type PlanRecord } from '@/lib/billing/subscription'

/**
 * Razorpay plumbing for GMS Cloud subscription payments.
 *
 * Mirrors the member-checkout integration already in the codebase
 * (order-then-verify, HMAC checked server-side) rather than introducing a
 * second payment system. The important difference: this bills the *tenant*
 * for their GMS Cloud plan, so records land in gym_subscription_invoices, not
 * in the tenant's own `payments` table.
 *
 * The existing integration is order-based, not mandate-based. There is no
 * stored card or auto-charge, so renewals are an explicit payment each cycle
 * and no payment-method vault exists to manage.
 */

export function ensureRazorpayConfig() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error(
            'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment.',
        )
    }
}

export type BillingInterval = 'monthly' | 'annual'

/**
 * What a tenant owes to move onto `plan` for one interval.
 *
 * Always computed here from the database plan row. The client sends a plan id
 * and an interval and nothing else; any amount it might submit is ignored.
 */
export function amountDueFor(plan: PlanRecord, interval: BillingInterval, discountPercentage = 0): number {
    const base = planPrice(plan, interval)
    return Math.max(base * (1 - discountPercentage / 100), 0)
}

export async function nextInvoiceNumber(): Promise<string> {
    const db = getSupabaseAdmin()
    const { data, error } = await db.rpc('next_platform_invoice_number' as never)

    if (error || !data) {
        // The sequence is the preferred source, but a billing action must not
        // fail because numbering did. A timestamp-based fallback stays unique.
        return `GMS${new Date().toISOString().slice(0, 7).replace('-', '')}${Date.now().toString().slice(-5)}`
    }

    return data as unknown as string
}

export type CreatedOrder = {
    orderId: string
    amount: number
    currency: 'INR'
    keyId: string
    invoiceNumber: string
}

/**
 * Opens a Razorpay order and writes the matching `open` invoice.
 *
 * The invoice row is written *before* the payment window opens, so a payment
 * that succeeds while the browser is closed still has a record for the webhook
 * to settle against.
 */
export async function createSubscriptionOrder(input: {
    gymId: string
    subscriptionId: string
    plan: PlanRecord
    interval: BillingInterval
    discountPercentage: number
    periodStart: string
    periodEnd: string
    purpose: 'renewal' | 'upgrade' | 'activation'
}): Promise<CreatedOrder> {
    ensureRazorpayConfig()

    const amount = amountDueFor(input.plan, input.interval, input.discountPercentage)

    if (amount <= 0) {
        throw new Error('This plan costs nothing at the selected interval. Contact support to activate it.')
    }

    const invoiceNumber = await nextInvoiceNumber()
    const auth = Buffer.from(
        `${process.env.RAZORPAY_KEY_ID!}:${process.env.RAZORPAY_KEY_SECRET!}`,
    ).toString('base64')

    const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: invoiceNumber,
            notes: {
                kind: 'gms_subscription',
                gym_id: input.gymId,
                subscription_id: input.subscriptionId,
                plan_id: input.plan.id,
                plan_name: input.plan.name,
                billing_interval: input.interval,
                purpose: input.purpose,
                invoice_number: invoiceNumber,
            },
        }),
    })

    const payload = await response.json()

    if (!response.ok || !payload.id) {
        throw new Error(payload?.error?.description || 'Unable to create the Razorpay order.')
    }

    const db = getSupabaseAdmin()
    const { error } = await db.from('gym_subscription_invoices').insert({
        gym_id: input.gymId,
        subscription_id: input.subscriptionId,
        invoice_number: invoiceNumber,
        status: 'open',
        currency_code: 'INR',
        amount_due: amount,
        amount_paid: 0,
        plan_id: input.plan.id,
        billing_interval: input.interval,
        razorpay_order_id: payload.id,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        metadata: { purpose: input.purpose },
    } as never)

    if (error) throw new Error(error.message)

    return {
        orderId: payload.id as string,
        amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID!,
        invoiceNumber,
    }
}

/** Constant-time comparison of the checkout signature. */
export function verifyCheckoutSignature(input: {
    orderId: string
    paymentId: string
    signature: string
}): boolean {
    ensureRazorpayConfig()

    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${input.orderId}|${input.paymentId}`)
        .digest('hex')

    const expectedBuffer = Buffer.from(expected, 'utf8')
    const providedBuffer = Buffer.from(input.signature ?? '', 'utf8')

    if (expectedBuffer.length !== providedBuffer.length) return false
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

/** Verifies a Razorpay webhook body against RAZORPAY_WEBHOOK_SECRET. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret || !signature) return false

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const expectedBuffer = Buffer.from(expected, 'utf8')
    const providedBuffer = Buffer.from(signature, 'utf8')

    if (expectedBuffer.length !== providedBuffer.length) return false
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

export function addInterval(from: Date, interval: BillingInterval): Date {
    const next = new Date(from)
    if (interval === 'annual') next.setFullYear(next.getFullYear() + 1)
    else next.setMonth(next.getMonth() + 1)
    return next
}

/**
 * Settles a paid subscription order.
 *
 * Idempotent by design: it only acts on an invoice that is still `open`, so
 * the browser-side verify and the webhook can both call it and exactly one
 * will move the subscription forward.
 *
 * Returns whether this call was the one that applied the payment.
 */
export async function settleSubscriptionPayment(input: {
    razorpayOrderId: string
    razorpayPaymentId: string
    paymentMethod?: string | null
}): Promise<{ applied: boolean; gymId: string | null }> {
    const db = getSupabaseAdmin()

    const invoiceResult = await db
        .from('gym_subscription_invoices')
        .select('*')
        .eq('razorpay_order_id', input.razorpayOrderId)
        .maybeSingle()

    const invoice = invoiceResult.data as {
        id: string
        gym_id: string
        subscription_id: string | null
        status: string
        amount_due: number
        plan_id: string | null
        billing_interval: BillingInterval | null
        period_start: string | null
        period_end: string | null
    } | null

    if (!invoice) return { applied: false, gymId: null }
    if (invoice.status === 'paid') return { applied: false, gymId: invoice.gym_id }

    // Conditional update: whichever caller flips `open` -> `paid` first owns
    // the follow-on subscription write. The second gets zero rows back.
    const claim = await db
        .from('gym_subscription_invoices')
        .update({
            status: 'paid',
            amount_paid: invoice.amount_due,
            paid_at: new Date().toISOString(),
            razorpay_payment_id: input.razorpayPaymentId,
            payment_method: input.paymentMethod ?? null,
        } as never)
        .eq('id', invoice.id)
        .eq('status', 'open')
        .select('id')

    if (claim.error || !claim.data || claim.data.length === 0) {
        return { applied: false, gymId: invoice.gym_id }
    }

    const interval: BillingInterval = invoice.billing_interval ?? 'monthly'
    const periodStart = invoice.period_start ? new Date(invoice.period_start) : new Date()
    const periodEnd = invoice.period_end
        ? new Date(invoice.period_end)
        : addInterval(periodStart, interval)

    const planResult = invoice.plan_id
        ? await db
              .from('platform_subscription_plans')
              .select('price_monthly, price_annual')
              .eq('id', invoice.plan_id)
              .maybeSingle()
        : { data: null }

    const plan = planResult.data as { price_monthly: number; price_annual: number } | null

    await db
        .from('gym_subscriptions')
        .update({
            status: 'active',
            ...(invoice.plan_id ? { plan_id: invoice.plan_id } : {}),
            billing_interval: interval,
            ...(plan ? { monthly_price: plan.price_monthly, annual_price: plan.price_annual } : {}),
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            next_invoice_at: periodEnd.toISOString(),
            failed_payment_count: 0,
            grace_ends_at: null,
            cancel_at_period_end: false,
            cancellation_reason: null,
            cancelled_at: null,
        } as never)
        .eq('gym_id', invoice.gym_id)

    // A paying tenant is active at the platform level too, so a previously
    // lapsed gym regains access without a separate manual step.
    await db
        .from('gyms')
        .update({ platform_status: 'active', is_active: true } as never)
        .eq('id', invoice.gym_id)
        .in('platform_status', ['trialing', 'suspended'])

    return { applied: true, gymId: invoice.gym_id }
}

/** Records a failed charge and opens the grace window. */
export async function recordFailedPayment(razorpayOrderId: string): Promise<void> {
    const db = getSupabaseAdmin()

    const invoiceResult = await db
        .from('gym_subscription_invoices')
        .select('id, gym_id, status')
        .eq('razorpay_order_id', razorpayOrderId)
        .maybeSingle()

    const invoice = invoiceResult.data as { id: string; gym_id: string; status: string } | null
    if (!invoice || invoice.status === 'paid') return

    await db
        .from('gym_subscription_invoices')
        .update({ status: 'failed', failed_at: new Date().toISOString() } as never)
        .eq('id', invoice.id)

    const subResult = await db
        .from('gym_subscriptions')
        .select('failed_payment_count, current_period_end, plan:platform_subscription_plans(grace_period_days)')
        .eq('gym_id', invoice.gym_id)
        .maybeSingle()

    const sub = subResult.data as {
        failed_payment_count: number
        current_period_end: string | null
        plan: { grace_period_days: number } | { grace_period_days: number }[] | null
    } | null

    if (!sub) return

    const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan
    const graceDays = plan?.grace_period_days ?? 7
    const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date()
    const graceEnd = new Date(Math.max(base.getTime(), Date.now()) + graceDays * 86_400_000)

    await db
        .from('gym_subscriptions')
        .update({
            status: 'past_due',
            failed_payment_count: (sub.failed_payment_count ?? 0) + 1,
            grace_ends_at: graceEnd.toISOString(),
        } as never)
        .eq('gym_id', invoice.gym_id)
}

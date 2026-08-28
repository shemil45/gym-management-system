'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { recordAudit } from '@/lib/platform/auth'
import { canFitOnPlan } from '@/lib/billing/entitlements'
import {
    getSubscriptionView,
    priceForInterval,
    type PlanRecord,
} from '@/lib/billing/subscription'
import {
    addInterval,
    createSubscriptionOrder,
    settleSubscriptionPayment,
    verifyCheckoutSignature,
    type BillingInterval,
} from '@/lib/billing/checkout'

/**
 * Tenant-side subscription management.
 *
 * Two rules run through every action here:
 *
 *  1. Only an owner or admin of the gym may change its subscription. Managers
 *     and below run the gym day to day but do not commit it to spending.
 *  2. Nothing about money comes from the client. The browser sends a plan id
 *     and an interval; price, entitlement and period are all read from the
 *     database on the server.
 */

export type BillingActionState = { error: string | null; success: string | null }

/** Roles allowed to commit the gym to a subscription change. */
const BILLING_ROLES = new Set(['owner', 'admin'])

type Authorized =
    | { ok: true; gymId: string; userId: string; error: null }
    | { ok: false; gymId: null; userId: null; error: string }

async function requireBillingAuthority(): Promise<Authorized> {
    const context = await getCurrentGymContext()

    if (!context.user || !context.gym || !context.isStaff) {
        return {
            ok: false,
            gymId: null,
            userId: null,
            error: 'Sign in to your gym to manage its subscription.',
        }
    }

    if (!context.role || !BILLING_ROLES.has(context.role)) {
        return {
            ok: false,
            gymId: null,
            userId: null,
            error: 'Only an owner or admin can change the GMS Cloud subscription for this gym.',
        }
    }

    return { ok: true, gymId: context.gym.id, userId: context.user.id, error: null }
}

async function loadPlan(planId: string): Promise<PlanRecord | null> {
    const db = getSupabaseAdmin()
    const result = await db
        .from('platform_subscription_plans')
        .select(
            'id, name, code, description, price_monthly, price_annual, trial_days, grace_period_days, max_members, max_staff, sort_order, is_active, is_public, features',
        )
        .eq('id', planId)
        .eq('is_active', true)
        .eq('is_public', true)
        .maybeSingle()

    return (result.data as PlanRecord | null) ?? null
}

export type StartCheckoutResult =
    | {
          success: true
          orderId: string
          amount: number
          currency: string
          keyId: string
          invoiceNumber: string
          planName: string
          prefill: { name: string; email: string; contact: string }
      }
    | { success: false; error: string }
    | { success: true; scheduled: true; message: string }

/**
 * Starts a plan change.
 *
 * Direction decides the mechanics, and direction is read from the plan's
 * `sort_order`, not its price - a discounted higher tier is still an upgrade.
 *
 *  - Upgrade / same-tier renewal: charge now, apply on payment.
 *  - Downgrade: schedule for period end. No refund is issued and the tenant
 *    keeps what they already paid for until it runs out.
 */
export async function startPlanCheckout(input: {
    planId: string
    interval: BillingInterval
}): Promise<StartCheckoutResult> {
    const auth = await requireBillingAuthority()
    if (!auth.ok) return { success: false, error: auth.error }

    if (input.interval !== 'monthly' && input.interval !== 'annual') {
        return { success: false, error: 'Choose either monthly or annual billing.' }
    }

    const [view, plan] = await Promise.all([getSubscriptionView(auth.gymId), loadPlan(input.planId)])

    if (!plan) return { success: false, error: 'That plan is no longer available.' }
    if (!view.subscription) {
        return { success: false, error: 'This gym has no subscription record. Contact support.' }
    }

    const fits = await canFitOnPlan(auth.gymId, plan)
    if (!fits.ok) return { success: false, error: fits.reason }

    const currentTier = view.plan?.sort_order ?? -1
    const isDowngrade = plan.sort_order < currentTier
    const isSameTier = plan.sort_order === currentTier

    // A downgrade on a still-running paid period is scheduled, not charged.
    if (isDowngrade && !view.isLapsed && view.subscription.status === 'active') {
        const db = getSupabaseAdmin()
        const effectiveAt = view.subscription.current_period_end ?? new Date().toISOString()

        const { error } = await db
            .from('gym_subscriptions')
            .update({
                pending_plan_id: plan.id,
                pending_billing_interval: input.interval,
                pending_effective_at: effectiveAt,
            } as never)
            .eq('gym_id', auth.gymId)

        if (error) return { success: false, error: error.message }

        await recordAudit({
            action: 'billing.downgrade.scheduled',
            entityType: 'gym_subscription',
            entityId: view.subscription.id,
            gymId: auth.gymId,
            metadata: { planId: plan.id, interval: input.interval, effectiveAt },
        })

        revalidatePath('/admin/settings/subscription')
        revalidatePath('/admin', 'layout')

        return {
            success: true,
            scheduled: true,
            message: `${plan.name} takes effect when your current plan ends. Nothing is charged today.`,
        }
    }

    // Same-tier change of interval on a live period is also just a schedule
    // change rather than a fresh charge, unless the period has lapsed.
    const now = new Date()
    const periodStart =
        isSameTier && !view.isLapsed && view.subscription.current_period_end
            ? new Date(view.subscription.current_period_end)
            : now

    const periodEnd = addInterval(periodStart, input.interval)

    try {
        const order = await createSubscriptionOrder({
            gymId: auth.gymId,
            subscriptionId: view.subscription.id,
            plan,
            interval: input.interval,
            discountPercentage: Number(view.subscription.discount_percentage ?? 0),
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            purpose: view.isLapsed ? 'renewal' : isSameTier ? 'renewal' : 'upgrade',
        })

        const db = getSupabaseAdmin()
        const gymResult = await db
            .from('gyms')
            .select('name, contact_email, contact_phone')
            .eq('id', auth.gymId)
            .maybeSingle()
        const gym = gymResult.data as {
            name: string
            contact_email: string | null
            contact_phone: string | null
        } | null

        await recordAudit({
            action: 'billing.checkout.started',
            entityType: 'gym_subscription',
            entityId: view.subscription.id,
            gymId: auth.gymId,
            metadata: { planId: plan.id, interval: input.interval, amount: order.amount },
        })

        return {
            success: true,
            orderId: order.orderId,
            amount: order.amount,
            currency: order.currency,
            keyId: order.keyId,
            invoiceNumber: order.invoiceNumber,
            planName: plan.name,
            prefill: {
                name: gym?.name ?? '',
                email: gym?.contact_email ?? '',
                contact: gym?.contact_phone ?? '',
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Could not start the payment.',
        }
    }
}

/**
 * Confirms a completed checkout.
 *
 * The signature is verified before anything is written, and settlement is
 * idempotent, so a browser confirm racing the webhook cannot double-apply.
 */
export async function confirmPlanCheckout(input: {
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
}): Promise<BillingActionState> {
    const auth = await requireBillingAuthority()
    if (!auth.ok) return { error: auth.error, success: null }

    const valid = verifyCheckoutSignature({
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
    })

    if (!valid) {
        return { error: 'We could not verify that payment. Contact support before trying again.', success: null }
    }

    // The invoice must belong to the gym the caller is signed in to; a valid
    // signature for someone else's order must not settle this tenant's plan.
    const db = getSupabaseAdmin()
    const invoiceResult = await db
        .from('gym_subscription_invoices')
        .select('gym_id')
        .eq('razorpay_order_id', input.razorpayOrderId)
        .maybeSingle()

    const invoice = invoiceResult.data as { gym_id: string } | null

    if (!invoice || invoice.gym_id !== auth.gymId) {
        return { error: 'That payment does not belong to this gym.', success: null }
    }

    const result = await settleSubscriptionPayment({
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
    })

    await recordAudit({
        action: 'billing.payment.confirmed',
        entityType: 'gym_subscription_invoice',
        entityId: input.razorpayOrderId,
        gymId: auth.gymId,
        metadata: { applied: result.applied },
    })

    revalidatePath('/admin/settings/subscription')
    revalidatePath('/admin', 'layout')

    return { error: null, success: 'Payment received. Your plan is active.' }
}

/** Cancels at period end. Access continues until the paid period runs out. */
export async function cancelSubscription(
    _prev: BillingActionState,
    formData: FormData,
): Promise<BillingActionState> {
    const auth = await requireBillingAuthority()
    if (!auth.ok) return { error: auth.error, success: null }

    const reason = String(formData.get('reason') ?? '').trim()
    const view = await getSubscriptionView(auth.gymId)

    if (!view.subscription) return { error: 'No subscription to cancel.', success: null }
    if (view.subscription.cancel_at_period_end) {
        return { error: null, success: 'This subscription is already set to end.' }
    }

    const db = getSupabaseAdmin()
    const { error } = await db
        .from('gym_subscriptions')
        .update({
            cancel_at_period_end: true,
            cancellation_reason: reason || null,
            // A scheduled downgrade is meaningless once the plan is ending.
            pending_plan_id: null,
            pending_billing_interval: null,
            pending_effective_at: null,
        } as never)
        .eq('gym_id', auth.gymId)

    if (error) return { error: error.message, success: null }

    await recordAudit({
        action: 'billing.subscription.cancelled',
        entityType: 'gym_subscription',
        entityId: view.subscription.id,
        gymId: auth.gymId,
        metadata: { reason: reason || null, effectiveAt: view.subscription.current_period_end },
    })

    revalidatePath('/admin/settings/subscription')
    revalidatePath('/admin', 'layout')

    return {
        error: null,
        success: 'Your subscription will end when the current period does. You can resume any time before then.',
    }
}

export async function resumeSubscription(
    _prev: BillingActionState,
    _formData: FormData,
): Promise<BillingActionState> {
    const auth = await requireBillingAuthority()
    if (!auth.ok) return { error: auth.error, success: null }

    const view = await getSubscriptionView(auth.gymId)
    if (!view.subscription) return { error: 'No subscription to resume.', success: null }

    const db = getSupabaseAdmin()
    const { error } = await db
        .from('gym_subscriptions')
        .update({ cancel_at_period_end: false, cancellation_reason: null } as never)
        .eq('gym_id', auth.gymId)

    if (error) return { error: error.message, success: null }

    await recordAudit({
        action: 'billing.subscription.resumed',
        entityType: 'gym_subscription',
        entityId: view.subscription.id,
        gymId: auth.gymId,
    })

    revalidatePath('/admin/settings/subscription')
    revalidatePath('/admin', 'layout')

    return { error: null, success: 'Your subscription will keep renewing.' }
}

/** Drops a scheduled downgrade before it takes effect. */
export async function cancelScheduledChange(
    _prev: BillingActionState,
    _formData: FormData,
): Promise<BillingActionState> {
    const auth = await requireBillingAuthority()
    if (!auth.ok) return { error: auth.error, success: null }

    const db = getSupabaseAdmin()
    const { error } = await db
        .from('gym_subscriptions')
        .update({
            pending_plan_id: null,
            pending_billing_interval: null,
            pending_effective_at: null,
        } as never)
        .eq('gym_id', auth.gymId)

    if (error) return { error: error.message, success: null }

    await recordAudit({
        action: 'billing.downgrade.cancelled',
        entityType: 'gym_subscription',
        gymId: auth.gymId,
    })

    revalidatePath('/admin/settings/subscription')
    return { error: null, success: 'Scheduled plan change removed. You stay on your current plan.' }
}

/** Read model for the client component; keeps price derivation server-side. */
export async function getPlanQuote(planId: string, interval: BillingInterval) {
    const auth = await requireBillingAuthority()
    if (!auth.ok) return { error: auth.error }

    const [view, plan] = await Promise.all([getSubscriptionView(auth.gymId), loadPlan(planId)])
    if (!plan || !view.subscription) return { error: 'That plan is no longer available.' }

    const discount = Number(view.subscription.discount_percentage ?? 0)
    const base = interval === 'annual' ? Number(plan.price_annual) : Number(plan.price_monthly)

    return {
        amount: Math.max(base * (1 - discount / 100), 0),
        discountPercentage: discount,
        currentPrice: priceForInterval(view.subscription),
    }
}

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
    recordFailedPayment,
    settleSubscriptionPayment,
    verifyWebhookSignature,
} from '@/lib/billing/checkout'
import { recordSystemEvent } from '@/lib/platform/auth'
import { failMemberPayment, settleMemberPayment } from '@/lib/payments/settle-member-payment'

export const runtime = 'nodejs'
/** The raw body is needed byte-for-byte to verify the signature. */
export const dynamic = 'force-dynamic'

/**
 * Razorpay webhook for every payment the platform's one Razorpay account
 * takes: GMS Cloud subscription invoices (orders tagged `kind:
 * gms_subscription`) and tenants' member purchases (everything else with an
 * order id, matched against `payments.razorpay_order_id`).
 *
 * For member purchases this is the safety net under the browser: the signed
 * response only reaches us if the member's tab survives the round trip, so a
 * closed tab or a dropped connection used to leave a captured payment pending
 * forever. Orders that match neither table are acknowledged and ignored.
 *
 * Two independent guards make replay safe:
 *  - `platform_webhook_events` has a unique (provider, event_id), so a retried
 *    delivery is rejected by the database rather than by a race-prone check.
 *  - Both settlers claim their row with a conditional update (`open` -> `paid`,
 *    `pending`/`failed` -> `paid`), so the webhook and the browser confirm
 *    cannot both apply the same payment.
 */
export async function POST(request: Request) {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!verifyWebhookSignature(rawBody, signature)) {
        // 401, not 400: an unsigned body is an authentication failure, and
        // Razorpay should not treat it as a malformed payload worth retrying.
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

    let event: {
        event?: string
        payload?: {
            payment?: {
                entity?: {
                    id?: string
                    order_id?: string
                    method?: string
                    error_description?: string | null
                    notes?: Record<string, string>
                }
            }
        }
    }

    try {
        event = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    const payment = event.payload?.payment?.entity
    const notes = payment?.notes ?? {}

    if (!payment?.order_id) {
        return NextResponse.json({ ok: true, ignored: true })
    }

    const isSubscription = notes.kind === 'gms_subscription'
    const db = getSupabaseAdmin()

    // Razorpay does not send a stable event id header on every plan, so the
    // payment id plus the event name is the dedupe key.
    const eventId = `${event.event ?? 'unknown'}:${payment.id ?? payment.order_id}`

    const claim = await db.from('platform_webhook_events').insert({
        provider: 'razorpay',
        event_id: eventId,
        event_type: event.event ?? null,
        gym_id: notes.gym_id ?? null,
        payload: event as never,
    } as never)

    if (claim.error) {
        // 23505 = already recorded. Acknowledge so Razorpay stops retrying.
        if (claim.error.code === '23505') {
            return NextResponse.json({ ok: true, duplicate: true })
        }
        await recordSystemEvent('razorpay-webhook', 'error', 'Failed to record webhook event', {
            error: claim.error.message,
            eventId,
        })
        return NextResponse.json({ error: 'could not record event' }, { status: 500 })
    }

    try {
        switch (event.event) {
            case 'payment.captured':
            case 'order.paid': {
                if (isSubscription) {
                    const result = await settleSubscriptionPayment({
                        razorpayOrderId: payment.order_id,
                        razorpayPaymentId: payment.id ?? '',
                        paymentMethod: payment.method ?? null,
                    })
                    return NextResponse.json({ ok: true, applied: result.applied })
                }

                const result = await settleMemberPayment({
                    razorpayOrderId: payment.order_id,
                    razorpayPaymentId: payment.id ?? '',
                })
                if (result.applied) {
                    // The browser did not get here first, so this is the
                    // recovery path working; worth a trace for support.
                    await recordSystemEvent('razorpay-webhook', 'info', 'Member payment settled by webhook', {
                        gymId: result.gymId,
                        orderId: payment.order_id,
                        invoiceNumber: result.invoiceNumber,
                    })
                }
                return NextResponse.json({
                    ok: true,
                    applied: result.applied,
                    ...(result.applied ? {} : { reason: result.reason }),
                })
            }

            case 'payment.failed': {
                if (isSubscription) {
                    await recordFailedPayment(payment.order_id)
                    await recordSystemEvent('razorpay-webhook', 'warning', 'Subscription payment failed', {
                        gymId: notes.gym_id ?? null,
                        orderId: payment.order_id,
                    })
                    return NextResponse.json({ ok: true, failed: true })
                }

                await failMemberPayment(payment.order_id, event.payload?.payment?.entity?.error_description ?? null)
                return NextResponse.json({ ok: true, failed: true })
            }

            default:
                return NextResponse.json({ ok: true, ignored: true })
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unhandled webhook error'
        await recordSystemEvent('razorpay-webhook', 'error', message, {
            event: event.event ?? null,
            orderId: payment.order_id,
        })
        // 500 so Razorpay retries; the dedupe row is already written, so the
        // retry short-circuits rather than reprocessing. That is deliberate:
        // a stuck payment should surface in system_events, not silently retry
        // a handler that is already failing.
        return NextResponse.json({ error: 'handler failed' }, { status: 500 })
    }
}

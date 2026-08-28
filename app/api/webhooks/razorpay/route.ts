import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
    recordFailedPayment,
    settleSubscriptionPayment,
    verifyWebhookSignature,
} from '@/lib/billing/checkout'
import { recordSystemEvent } from '@/lib/platform/auth'

export const runtime = 'nodejs'
/** The raw body is needed byte-for-byte to verify the signature. */
export const dynamic = 'force-dynamic'

/**
 * Razorpay webhook for GMS Cloud subscription payments.
 *
 * Only handles orders tagged `kind: gms_subscription` in their notes; the
 * tenant's own member payments flow through a different path and must not be
 * settled here.
 *
 * Two independent guards make replay safe:
 *  - `platform_webhook_events` has a unique (provider, event_id), so a retried
 *    delivery is rejected by the database rather than by a race-prone check.
 *  - `settleSubscriptionPayment` only acts on an invoice still marked `open`,
 *    so the webhook and the browser confirm cannot both apply the same payment.
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

    // Ignore anything that is not a platform subscription payment.
    if (notes.kind !== 'gms_subscription' || !payment?.order_id) {
        return NextResponse.json({ ok: true, ignored: true })
    }

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
                const result = await settleSubscriptionPayment({
                    razorpayOrderId: payment.order_id,
                    razorpayPaymentId: payment.id ?? '',
                    paymentMethod: payment.method ?? null,
                })
                return NextResponse.json({ ok: true, applied: result.applied })
            }

            case 'payment.failed': {
                await recordFailedPayment(payment.order_id)
                await recordSystemEvent('razorpay-webhook', 'warning', 'Subscription payment failed', {
                    gymId: notes.gym_id ?? null,
                    orderId: payment.order_id,
                })
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

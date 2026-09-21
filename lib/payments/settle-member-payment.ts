import 'server-only'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendMemberWhatsAppNotification } from '@/lib/notifications/service'
import { gymHasFeature } from '@/lib/gym/features'

/**
 * Applies a member's self-service Razorpay payment from the pending row alone.
 *
 * Reached from two directions that know nothing of each other: the browser's
 * signed-response verify in `app/member/plans/actions.ts`, and Razorpay's
 * `payment.captured` webhook. Either can arrive first, or only one may arrive
 * at all (a tab closed mid-verify never reaches the server; a webhook can be
 * delayed for minutes), so everything the settlement needs was written on the
 * row when the order was created and the row itself is the lock.
 *
 * The claim accepts `failed` as well as `pending`: the browser marks a row
 * failed when the checkout modal closes, and that guess is outranked by a
 * signed or webhook-confirmed capture for the same order.
 */

type SettleResult =
    | { applied: true; invoiceNumber: string | null; gymId: string }
    | { applied: false; reason: 'not-found' | 'already-paid' | 'claimed-elsewhere'; gymId: string | null; invoiceNumber: string | null }

type PendingRow = {
    id: string
    gym_id: string
    member_id: string
    invoice_number: string | null
    payment_status: 'paid' | 'pending' | 'failed' | 'refunded'
    membership_plan_id: string | null
    membership_start_date: string | null
    membership_end_date: string | null
    referral_coins_used: number
    notes: string | null
}

/** Fallback when a gym row has no bonus (pre-migration rows only). */
export const DEFAULT_REFERRER_BONUS_COINS = 100

/** Coins a converted referral is worth at this gym; set under Settings → Referrals. */
export async function getReferralBonusCoins(gymId: string): Promise<number> {
    const { data } = await getSupabaseAdmin().from('gyms').select('referral_bonus_coins').eq('id', gymId).maybeSingle()
    const value = (data as { referral_bonus_coins: number | null } | null)?.referral_bonus_coins
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : DEFAULT_REFERRER_BONUS_COINS
}

export async function settleMemberPayment(input: {
    razorpayOrderId: string
    razorpayPaymentId: string
}): Promise<SettleResult> {
    const db = getSupabaseAdmin()

    const rowResult = await db
        .from('payments')
        .select(
            'id, gym_id, member_id, invoice_number, payment_status, membership_plan_id, membership_start_date, membership_end_date, referral_coins_used, notes',
        )
        .eq('razorpay_order_id', input.razorpayOrderId)
        .maybeSingle()
    const row = rowResult.data as PendingRow | null

    if (!row) return { applied: false, reason: 'not-found', gymId: null, invoiceNumber: null }
    if (row.payment_status === 'paid') {
        return { applied: false, reason: 'already-paid', gymId: row.gym_id, invoiceNumber: row.invoice_number }
    }

    // Conditional update: whoever flips the row to `paid` first owns the
    // membership write. The other caller gets zero rows back and stops.
    const claim = await db
        .from('payments')
        .update({
            payment_status: 'paid',
            razorpay_payment_id: input.razorpayPaymentId,
            notes: settledNotes(row.notes),
        })
        .eq('id', row.id)
        .in('payment_status', ['pending', 'failed'])
        .select('id')

    if (claim.error || !claim.data || claim.data.length === 0) {
        return { applied: false, reason: 'claimed-elsewhere', gymId: row.gym_id, invoiceNumber: row.invoice_number }
    }

    const memberResult = await db
        .from('members')
        .select('id, membership_expiry_date, referral_coins_balance')
        .eq('id', row.member_id)
        .single()
    const member = memberResult.data as {
        id: string
        membership_expiry_date: string | null
        referral_coins_balance: number | null
    } | null
    if (!member) throw new Error('Member record not found for settled payment')

    const wasRenewal = member.membership_expiry_date !== null

    const { error: memberError } = await db
        .from('members')
        .update({
            ...(row.membership_plan_id ? { membership_plan_id: row.membership_plan_id } : {}),
            membership_start_date: row.membership_start_date,
            membership_expiry_date: row.membership_end_date,
            status: 'active',
            referral_coins_balance: Math.max(
                0,
                (member.referral_coins_balance ?? 0) - row.referral_coins_used,
            ),
        })
        .eq('id', member.id)
    if (memberError) throw new Error(memberError.message)

    await creditReferrers(row.gym_id, row.member_id)
    await notifyPaymentReceived(row.member_id, wasRenewal)

    revalidatePath('/member')
    revalidatePath('/member/membership')
    revalidatePath('/member/payments')
    revalidatePath('/member/referrals')

    return { applied: true, invoiceNumber: row.invoice_number, gymId: row.gym_id }
}

/**
 * Closes a pending row the gateway reported as failed. Only `pending` rows
 * qualify: a paid row is settled and a failed row is already closed.
 */
export async function failMemberPayment(razorpayOrderId: string, reason: string | null): Promise<void> {
    const db = getSupabaseAdmin()
    await db
        .from('payments')
        .update({
            payment_status: 'failed',
            notes: reason
                ? `Razorpay payment failed or cancelled. Reason: ${reason}`
                : 'Razorpay payment failed or was cancelled by the user.',
        })
        .eq('razorpay_order_id', razorpayOrderId)
        .eq('payment_status', 'pending')
}

/** "Pending self-service ... coins reserved" becomes the settled wording. */
function settledNotes(notes: string | null): string | null {
    if (!notes) return notes
    return notes
        .replace(/^Pending self-service/, 'Self-service')
        .replace(/Referral coins reserved:/, 'Referral coins used:')
}

/**
 * Pays the referrer bonus for a referred member's first settled payment.
 *
 * Covers staff-recorded referrals (a member enrolled with a referrer named
 * at the desk). Link-sourced leads are converted and credited by
 * `convertReferralLead` at registration instead, and are never still
 * pending once a member is attached.
 *
 * Skipped entirely when the gym's `referrals` feature is off: the pending
 * referral row is left as it is rather than marked converted, so turning
 * the program back on later still honours it.
 */
export async function creditReferrers(gymId: string, referredId: string) {
    if (!(await gymHasFeature(gymId, 'referrals'))) return

    const db = getSupabaseAdmin()
    const bonus = await getReferralBonusCoins(gymId)
    const { data: converted } = await db
        .from('referrals')
        .update({ status: 'converted', applied_at: new Date().toISOString() })
        .select('referrer_id')
        .eq('gym_id', gymId)
        .eq('referred_id', referredId)
        .eq('status', 'pending')

    for (const referral of converted ?? []) {
        const { data: referrer } = await db
            .from('members')
            .select('id, referral_coins_balance')
            .eq('id', referral.referrer_id)
            .single()
        if (referrer) {
            await db
                .from('members')
                .update({
                    referral_coins_balance: (referrer.referral_coins_balance || 0) + bonus,
                })
                .eq('id', referrer.id)
        }
    }
}

/** Fire-and-log: a settled payment must not be reported as failed because the WhatsApp send failed. */
async function notifyPaymentReceived(memberId: string, wasRenewal: boolean) {
    try {
        const result = await sendMemberWhatsAppNotification({
            memberId,
            notificationType: 'payment_received',
            source: 'api',
            confirmationKind: wasRenewal ? 'renewal' : 'payment',
        })
        if (!result.success) {
            console.warn('[payments] Confirmation WhatsApp was not sent after self-service payment', {
                memberId,
                error: result.error,
            })
        }
    } catch (error) {
        console.error('[payments] Unexpected error sending payment confirmation WhatsApp', {
            memberId,
            error: error instanceof Error ? error.message : error,
        })
    }
}

import { addDays, format } from 'date-fns'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { InsertTables, QueryResult } from '@/lib/types'
import type { NotificationType } from '@/lib/notifications/templates'
import {
    buildMembershipExpiredMessage,
    buildMembershipExpiringMessage,
    buildPaymentReceivedMessage,
    buildReferralRewardMessage,
    buildWelcomeNewMemberMessage,
} from '@/lib/notifications/templates'

type MemberRecord = {
    id: string
    member_id: string
    full_name: string
    phone: string
    status: 'active' | 'inactive' | 'frozen' | 'expired'
    membership_expiry_date: string | null
    created_at: string
    gym_id: string
    membership_plan: {
        name: string
    } | null
}

type GymNotificationSettings = {
    notify_expiry_reminder_enabled: boolean
    notify_expired_notice_enabled: boolean
    notify_payment_confirmation_enabled: boolean
    notify_renewal_confirmation_enabled: boolean
    notify_welcome_message_enabled: boolean
}

type LatestPaymentRecord = {
    amount: number
    invoice_number: string | null
    payment_date: string
    membership_end_date: string | null
}

type LatestReferralRecord = {
    referred: {
        full_name: string
    } | null
}

type ExpiringMemberRecord = Pick<MemberRecord, 'id'>
type NotificationLogIdRecord = { id: string }

function assertNever(value: never): never {
    throw new Error(`Unsupported notification type: ${String(value)}`)
}

export type SendMemberNotificationInput = {
    memberId: string
    notificationType: NotificationType
    skipIfAlreadySentToday?: boolean
    source?: 'api' | 'cron'
    dateValue?: string
    /** Only meaningful for 'payment_received': which gym setting gates this send. Defaults to 'payment'. */
    confirmationKind?: 'payment' | 'renewal'
    /** Overrides the days-remaining figure shown in the membership_expiring template (e.g. the gym's configured reminder window). */
    daysRemaining?: number
}

export type SendMemberNotificationResult =
    | {
        success: true
        status: 'sent'
        message: string
        memberId: string
        notificationType: NotificationType
        logId: string
        twilioSid: string
    }
    | {
        success: true
        status: 'skipped'
        message: string
        memberId: string
        notificationType: NotificationType
        reason: string
    }
    | {
        success: false
        status: 'failed'
        message: string
        memberId: string
        notificationType: NotificationType
        error: string
        logId?: string
    }

function getTodayValue(date = new Date()) {
    return format(date, 'yyyy-MM-dd')
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message
    }

    return fallback
}

async function insertNotificationLog(entry: InsertTables<'notification_logs'>) {
    const supabase = getSupabaseAdmin()
    const logResult = await supabase
        .from('notification_logs')
        .insert(entry as never)
        .select('id')
        .single()

    const { data, error } = logResult as unknown as QueryResult<NotificationLogIdRecord | null>

    if (error) {
        throw new Error(getErrorMessage(error, 'Failed to insert notification log.'))
    }

    if (!data) {
        throw new Error('Notification log record was not returned after insert.')
    }

    return data.id
}

async function hasNotificationBeenSentToday(memberId: string, notificationType: NotificationType, dateValue = getTodayValue()) {
    const supabase = getSupabaseAdmin()
    const start = `${dateValue}T00:00:00.000Z`
    const end = `${format(addDays(new Date(dateValue), 1), 'yyyy-MM-dd')}T00:00:00.000Z`

    const result = await supabase
        .from('notification_logs')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', memberId)
        .eq('notification_type', notificationType)
        .eq('status', 'sent')
        .gte('sent_at', start)
        .lt('sent_at', end)

    if (result.error) {
        throw new Error(result.error.message)
    }

    return (result.count || 0) > 0
}

async function getMemberRecord(memberId: string) {
    const supabase = getSupabaseAdmin()
    const result = await supabase
        .from('members')
        .select(`
            id,
            member_id,
            full_name,
            phone,
            status,
            membership_expiry_date,
            created_at,
            gym_id,
            membership_plan:membership_plans(name)
        `)
        .eq('id', memberId)
        .single()

    if (result.error) {
        throw result.error
    }

    const raw = result.data as unknown as MemberRecord & {
        membership_plan: MemberRecord['membership_plan'] | Array<MemberRecord['membership_plan']>
    }

    return {
        ...raw,
        membership_plan: Array.isArray(raw.membership_plan)
            ? raw.membership_plan[0] ?? null
            : raw.membership_plan ?? null,
    }
}

async function getLatestPayment(memberId: string) {
    const supabase = getSupabaseAdmin()
    const result = await supabase
        .from('payments')
        .select('amount, invoice_number, payment_date, membership_end_date')
        .eq('member_id', memberId)
        .eq('payment_status', 'paid')
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (result.error) {
        throw result.error
    }

    return result.data as LatestPaymentRecord | null
}

async function getLatestAppliedReferral(memberId: string) {
    const supabase = getSupabaseAdmin()
    const result = await supabase
        .from('referrals')
        .select('referred:members!referrals_referred_id_fkey(full_name)')
        .eq('referrer_id', memberId)
        .eq('status', 'applied')
        .order('applied_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

    if (result.error) {
        throw result.error
    }

    return result.data as LatestReferralRecord | null
}

async function getGymNotificationSettings(gymId: string): Promise<GymNotificationSettings> {
    const fallback: GymNotificationSettings = {
        notify_expiry_reminder_enabled: true,
        notify_expired_notice_enabled: true,
        notify_payment_confirmation_enabled: true,
        notify_renewal_confirmation_enabled: true,
        notify_welcome_message_enabled: true,
    }

    const supabase = getSupabaseAdmin()
    const result = await supabase
        .from('gyms')
        .select('notify_expiry_reminder_enabled, notify_expired_notice_enabled, notify_payment_confirmation_enabled, notify_renewal_confirmation_enabled, notify_welcome_message_enabled')
        .eq('id', gymId)
        .single()

    const { data, error } = result as unknown as QueryResult<GymNotificationSettings | null>

    // Fail open: if settings can't be read, preserve the pre-existing behavior (always send)
    // rather than silently dropping notifications because of an unrelated read error.
    if (error || !data) {
        return fallback
    }

    return data
}

function isNotificationEnabled(
    settings: GymNotificationSettings,
    notificationType: NotificationType,
    confirmationKind: 'payment' | 'renewal'
) {
    switch (notificationType) {
        case 'welcome_new_member':
            return settings.notify_welcome_message_enabled
        case 'payment_received':
            return confirmationKind === 'renewal'
                ? settings.notify_renewal_confirmation_enabled
                : settings.notify_payment_confirmation_enabled
        case 'membership_expiring':
            return settings.notify_expiry_reminder_enabled
        case 'membership_expired':
            return settings.notify_expired_notice_enabled
        case 'referral_reward_earned':
            return true
        default:
            return assertNever(notificationType)
    }
}

async function buildNotificationMessage(member: MemberRecord, notificationType: NotificationType, daysRemaining?: number) {
    const gymName = process.env.NEXT_PUBLIC_APP_NAME || 'your gym'
    const planName = member.membership_plan?.name || null

    switch (notificationType) {
        case 'membership_expiring': {
            if (!member.membership_expiry_date) {
                throw new Error('Member does not have a membership expiry date for expiring notifications.')
            }

            return buildMembershipExpiringMessage({
                fullName: member.full_name,
                gymName,
                expiryDate: member.membership_expiry_date,
                daysRemaining: daysRemaining ?? 7,
                planName,
            })
        }
        case 'membership_expired': {
            if (!member.membership_expiry_date) {
                throw new Error('Member does not have a membership expiry date for expired notifications.')
            }

            return buildMembershipExpiredMessage({
                fullName: member.full_name,
                gymName,
                expiryDate: member.membership_expiry_date,
                planName,
            })
        }
        case 'payment_received': {
            const payment = await getLatestPayment(member.id)

            if (!payment) {
                throw new Error('No paid payment record found for this member.')
            }

            return buildPaymentReceivedMessage({
                fullName: member.full_name,
                gymName,
                amount: Number(payment.amount),
                invoiceNumber: payment.invoice_number,
                membershipEndDate: payment.membership_end_date,
                paymentDate: payment.payment_date,
                planName,
            })
        }
        case 'welcome_new_member':
            return buildWelcomeNewMemberMessage({
                fullName: member.full_name,
                gymName,
                memberCode: member.member_id,
                membershipEndDate: member.membership_expiry_date,
                planName,
            })
        case 'referral_reward_earned': {
            const referral = await getLatestAppliedReferral(member.id)

            return buildReferralRewardMessage({
                fullName: member.full_name,
                gymName,
                rewardCoins: 500,
                referredMemberName: referral?.referred?.full_name || null,
            })
        }
        default:
            return assertNever(notificationType)
    }
}

async function logFailure(memberId: string, notificationType: NotificationType, message: string, error: string) {
    try {
        return await insertNotificationLog({
            member_id: memberId,
            notification_type: notificationType,
            message,
            status: 'failed',
            sent_at: new Date().toISOString(),
        })
    } catch (logError) {
        console.error('[notifications] Failed to persist failed notification log', {
            memberId,
            notificationType,
            error,
            logError: getErrorMessage(logError, 'Unknown notification log error'),
        })

        return undefined
    }
}

export async function sendMemberWhatsAppNotification(input: SendMemberNotificationInput): Promise<SendMemberNotificationResult> {
    const { memberId, notificationType, skipIfAlreadySentToday = false, source = 'api', dateValue, confirmationKind = 'payment', daysRemaining } = input

    try {
        const member = await getMemberRecord(memberId)

        if (!member.phone?.trim()) {
            const error = 'Member does not have a phone number.'
            const logId = await logFailure(memberId, notificationType, error, error)

            return {
                success: false,
                status: 'failed',
                message: error,
                memberId,
                notificationType,
                error,
                logId,
            }
        }

        const settings = await getGymNotificationSettings(member.gym_id)

        if (!isNotificationEnabled(settings, notificationType, confirmationKind)) {
            console.info('[notifications] Skipping notification disabled by gym settings', {
                memberId,
                notificationType,
                source,
            })

            return {
                success: true,
                status: 'skipped',
                message: 'Notification is disabled in this gym\'s settings.',
                memberId,
                notificationType,
                reason: 'disabled_by_settings',
            }
        }

        if (skipIfAlreadySentToday) {
            const alreadySent = await hasNotificationBeenSentToday(memberId, notificationType, dateValue)

            if (alreadySent) {
                console.info('[notifications] Skipping duplicate notification for today', {
                    memberId,
                    notificationType,
                    source,
                })

                return {
                    success: true,
                    status: 'skipped',
                    message: 'Notification already sent today.',
                    memberId,
                    notificationType,
                    reason: 'already_sent_today',
                }
            }
        }

        const message = await buildNotificationMessage(member, notificationType, daysRemaining)
        const sendResult = await sendWhatsAppMessage(member.phone, message)

        if (!sendResult.success) {
            const logId = await logFailure(memberId, notificationType, message, sendResult.error)

            return {
                success: false,
                status: 'failed',
                message,
                memberId,
                notificationType,
                error: sendResult.error,
                logId,
            }
        }

        const logId = await insertNotificationLog({
            member_id: memberId,
            notification_type: notificationType,
            message,
            status: 'sent',
            sent_at: new Date().toISOString(),
        })

        console.info('[notifications] Notification sent successfully', {
            memberId,
            notificationType,
            source,
            sid: sendResult.sid,
            logId,
        })

        return {
            success: true,
            status: 'sent',
            message,
            memberId,
            notificationType,
            logId,
            twilioSid: sendResult.sid,
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error, 'Failed to send WhatsApp notification.')
        const fallbackMessage = `Notification delivery failed for member ${memberId}.`
        const logId = await logFailure(memberId, notificationType, fallbackMessage, errorMessage)

        console.error('[notifications] Notification pipeline failed', {
            memberId,
            notificationType,
            source,
            error: errorMessage,
        })

        return {
            success: false,
            status: 'failed',
            message: fallbackMessage,
            memberId,
            notificationType,
            error: errorMessage,
            logId,
        }
    }
}

export async function getMembersExpiringOn(dateValue: string, gymId: string): Promise<ExpiringMemberRecord[]> {
    const supabase = getSupabaseAdmin()
    const result = await supabase
        .from('members')
        .select('id')
        .eq('status', 'active')
        .eq('membership_expiry_date', dateValue)
        .eq('gym_id', gymId)

    if (result.error) {
        throw new Error(result.error.message)
    }

    return (result.data ?? []) as ExpiringMemberRecord[]
}

export type GymExpiryReminderConfig = {
    id: string
    notify_expiry_reminder_enabled: boolean
    notify_expiry_reminder_days: number
    notify_expired_notice_enabled: boolean
    notify_expired_notice_days: number
}

/** Active gyms that currently have the expiry reminder and/or the expired notice turned on, with their configured day offsets. */
export async function getActiveGymsForExpiryReminders(): Promise<GymExpiryReminderConfig[]> {
    const supabase = getSupabaseAdmin()
    const result = await supabase
        .from('gyms')
        .select('id, notify_expiry_reminder_enabled, notify_expiry_reminder_days, notify_expired_notice_enabled, notify_expired_notice_days')
        .eq('is_active', true)
        .or('notify_expiry_reminder_enabled.eq.true,notify_expired_notice_enabled.eq.true')

    if (result.error) {
        throw new Error(result.error.message)
    }

    return (result.data ?? []) as GymExpiryReminderConfig[]
}

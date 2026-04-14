import { addDays, format } from 'date-fns'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { InsertTables, QueryResult } from '@/lib/types'
import type { NotificationType } from '@/lib/notifications/templates'
import {
    buildMembershipExpiredMessage,
    buildMembershipExpiringMessage,
    buildPaymentReceivedMessage,
    buildPaymentReminderMessage,
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
    membership_plan: {
        name: string
    } | null
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

async function buildNotificationMessage(member: MemberRecord, notificationType: NotificationType) {
    const gymName = process.env.NEXT_PUBLIC_APP_NAME || 'your gym'
    const planName = member.membership_plan?.name || null

    switch (notificationType) {
        case 'payment_reminder': {
            if (!member.membership_expiry_date) {
                throw new Error('Member does not have a membership expiry date for payment reminders.')
            }

            return buildPaymentReminderMessage({
                fullName: member.full_name,
                gymName,
                expiryDate: member.membership_expiry_date,
                daysRemaining: 3,
                planName,
            })
        }
        case 'membership_expiring': {
            if (!member.membership_expiry_date) {
                throw new Error('Member does not have a membership expiry date for expiring notifications.')
            }

            return buildMembershipExpiringMessage({
                fullName: member.full_name,
                gymName,
                expiryDate: member.membership_expiry_date,
                daysRemaining: 7,
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
    const { memberId, notificationType, skipIfAlreadySentToday = false, source = 'api', dateValue } = input

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

        const message = await buildNotificationMessage(member, notificationType)
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

export async function getMembersExpiringOn(dateValue: string): Promise<ExpiringMemberRecord[]> {
    const supabase = getSupabaseAdmin()
    const result = await supabase
        .from('members')
        .select('id')
        .eq('status', 'active')
        .eq('membership_expiry_date', dateValue)

    if (result.error) {
        throw new Error(result.error.message)
    }

    return (result.data ?? []) as ExpiringMemberRecord[]
}

import { format } from 'date-fns'

export const notificationTypes = [
    'payment_reminder',
    'membership_expiring',
    'membership_expired',
    'payment_received',
    'welcome_new_member',
    'referral_reward_earned',
] as const

export type NotificationType = (typeof notificationTypes)[number]

type BaseTemplateData = {
    fullName: string
    gymName?: string | null
}

export type PaymentReminderTemplateData = BaseTemplateData & {
    expiryDate: string
    daysRemaining: number
    planName?: string | null
}

export type MembershipExpiringTemplateData = BaseTemplateData & {
    expiryDate: string
    daysRemaining: number
    planName?: string | null
}

export type MembershipExpiredTemplateData = BaseTemplateData & {
    expiryDate: string
    planName?: string | null
}

export type PaymentReceivedTemplateData = BaseTemplateData & {
    amount: number
    invoiceNumber?: string | null
    paymentDate?: string | null
    planName?: string | null
    membershipEndDate?: string | null
}

export type WelcomeNewMemberTemplateData = BaseTemplateData & {
    memberCode: string
    planName?: string | null
    membershipEndDate?: string | null
}

export type ReferralRewardTemplateData = BaseTemplateData & {
    rewardCoins: number
    referredMemberName?: string | null
}

function formatDisplayDate(value: string | null | undefined) {
    if (!value) return 'N/A'
    return format(new Date(value), 'dd MMM yyyy')
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount)
}

function getGymName(value?: string | null) {
    return value?.trim() || process.env.NEXT_PUBLIC_APP_NAME || 'your gym'
}

/** Finance messages: payment_reminder, payment_received, membership_expiring, membership_expired */
function getSupportFooter(gymName?: string | null) {
    return `_— ${getGymName(gymName)} Support_`
}

/** Relationship messages: welcome_new_member, referral_reward_earned */
function getFamilyFooter(gymName?: string | null) {
    return `_— ${getGymName(gymName)} Family 🏋️_`
}

// ─── Payment Reminder ────────────────────────────────────────────────────────

export function buildPaymentReminderMessage(data: PaymentReminderTemplateData) {
    return [
        `⏰ *Payment Reminder*`,
        ``,
        `Hi *${data.fullName}*,`,
        ``,
        `Your *${data.planName || 'membership'}* at *${getGymName(data.gymName)}* is coming up for renewal soon.`,
        ``,
        `📋 *Membership Details*`,
        `• Plan: *${data.planName || 'Membership'}*`,
        `• Expiry Date: *${formatDisplayDate(data.expiryDate)}*`,
        `• Days Remaining: *${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}*`,
        ``,
        `✅ Please renew in advance to avoid any interruption in access.`,
        ``,
        `For assistance, reach out to the front desk.`,
        ``,
        getSupportFooter(data.gymName),
    ].join('\n')
}

// ─── Membership Expiring ─────────────────────────────────────────────────────

export function buildMembershipExpiringMessage(data: MembershipExpiringTemplateData) {
    return [
        `⚠️ *Membership Expiring Soon*`,
        ``,
        `Hi *${data.fullName}*,`,
        ``,
        `Your *${data.planName || 'membership'}* at *${getGymName(data.gymName)}* is nearing its expiry date.`,
        ``,
        `📋 *Membership Details*`,
        `• Plan: *${data.planName || 'Membership'}*`,
        `• Expiry Date: *${formatDisplayDate(data.expiryDate)}*`,
        `• Days Remaining: *${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}*`,
        ``,
        `🔄 Renew before the expiry date to keep your access uninterrupted.`,
        ``,
        `For assistance, reach out to the front desk.`,
        ``,
        getSupportFooter(data.gymName),
    ].join('\n')
}

// ─── Membership Expired ──────────────────────────────────────────────────────

export function buildMembershipExpiredMessage(data: MembershipExpiredTemplateData) {
    return [
        `❌ *Membership Expired*`,
        ``,
        `Hi *${data.fullName}*,`,
        ``,
        `Your *${data.planName || 'membership'}* at *${getGymName(data.gymName)}* has expired.`,
        ``,
        `📋 *Membership Details*`,
        `• Plan: *${data.planName || 'Membership'}*`,
        `• Expired On: *${formatDisplayDate(data.expiryDate)}*`,
        ``,
        `🔄 Renew your membership to restore full access and continue your fitness journey.`,
        ``,
        `For renewal assistance, contact the front desk.`,
        ``,
        getSupportFooter(data.gymName),
    ].join('\n')
}

// ─── Payment Received ────────────────────────────────────────────────────────

export function buildPaymentReceivedMessage(data: PaymentReceivedTemplateData) {
    const lines = [
        `✅ *Payment Confirmed*`,
        ``,
        `Hi *${data.fullName}*,`,
        ``,
        `We have successfully received your payment. Thank you!`,
        ``,
        `🧾 *Payment Details*`,
        `• Amount: *${formatCurrency(data.amount)}*${data.planName ? ` _(${data.planName})_` : ''}`,
    ]

    if (data.invoiceNumber) lines.push(`• Invoice No: *${data.invoiceNumber}*`)
    if (data.paymentDate) lines.push(`• Payment Date: *${formatDisplayDate(data.paymentDate)}*`)
    if (data.membershipEndDate) lines.push(`• Valid Until: *${formatDisplayDate(data.membershipEndDate)}*`)

    lines.push(
        ``,
        `🏋️ Your membership is now active. We appreciate your continued trust in *${getGymName(data.gymName)}*.`,
        ``,
        getSupportFooter(data.gymName),
    )

    return lines.join('\n')
}

// ─── Welcome New Member ──────────────────────────────────────────────────────

export function buildWelcomeNewMemberMessage(data: WelcomeNewMemberTemplateData) {
    const lines = [
        `🎉 *Welcome to ${getGymName(data.gymName)}!*`,
        ``,
        `Hi *${data.fullName}*,`,
        ``,
        `Your membership has been successfully activated. We're thrilled to have you on board!`,
        ``,
        `🪪 *Membership Details*`,
        `• Member ID: *${data.memberCode}*`,
    ]

    if (data.planName) lines.push(`• Plan: *${data.planName}*`)
    if (data.membershipEndDate) lines.push(`• Valid Until: *${formatDisplayDate(data.membershipEndDate)}*`)

    lines.push(
        ``,
        `💪 We look forward to supporting your fitness journey.`,
        ``,
        getFamilyFooter(data.gymName),
    )

    return lines.join('\n')
}

// ─── Referral Reward ─────────────────────────────────────────────────────────

export function buildReferralRewardMessage(data: ReferralRewardTemplateData) {
    return [
        `🎁 *Referral Reward Earned!*`,
        ``,
        `Hi *${data.fullName}*,`,
        ``,
        `Great news — your referral has been rewarded!`,
        ``,
        `🏅 *Reward Details*`,
        `• Coins Earned: *${data.rewardCoins} coins*`,
        ...(data.referredMemberName ? [`• Referred Member: *${data.referredMemberName}*`] : []),
        ``,
        `💳 Your reward has been credited to your account and can be applied toward future membership payments.`,
        ``,
        `Thank you for growing the *${getGymName(data.gymName)}* community! 🙌`,
        ``,
        getFamilyFooter(data.gymName),
    ].join('\n')
}
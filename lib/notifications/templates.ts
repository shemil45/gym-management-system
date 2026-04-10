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
    if (!value) {
        return 'N/A'
    }

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

export function buildPaymentReminderMessage(data: PaymentReminderTemplateData) {
    return [
        `Hi ${data.fullName},`,
        '',
        `This is a payment reminder from ${getGymName(data.gymName)}.`,
        `Your ${data.planName || 'membership'} expires in ${data.daysRemaining} days on ${formatDisplayDate(data.expiryDate)}.`,
        'Please renew in time to keep your access active.',
        '',
        'Reply to this message or contact the front desk if you need help.',
    ].join('\n')
}

export function buildMembershipExpiringMessage(data: MembershipExpiringTemplateData) {
    return [
        `Hi ${data.fullName},`,
        '',
        `Your ${data.planName || 'membership'} at ${getGymName(data.gymName)} expires in ${data.daysRemaining} days on ${formatDisplayDate(data.expiryDate)}.`,
        'Renew early to avoid any interruption in your workouts.',
        '',
        'We would love to keep seeing you in the gym.',
    ].join('\n')
}

export function buildMembershipExpiredMessage(data: MembershipExpiredTemplateData) {
    return [
        `Hi ${data.fullName},`,
        '',
        `Your ${data.planName || 'membership'} at ${getGymName(data.gymName)} expired on ${formatDisplayDate(data.expiryDate)}.`,
        'Renew your membership to restore access and continue training without delay.',
        '',
        'Reply here if you want us to help with the renewal.',
    ].join('\n')
}

export function buildPaymentReceivedMessage(data: PaymentReceivedTemplateData) {
    return [
        `Hi ${data.fullName},`,
        '',
        `We have received your payment of ${formatCurrency(data.amount)}${data.planName ? ` for ${data.planName}` : ''}.`,
        `${data.invoiceNumber ? `Invoice: ${data.invoiceNumber}` : 'Invoice details will be shared soon.'}`,
        `${data.paymentDate ? `Payment date: ${formatDisplayDate(data.paymentDate)}` : ''}`,
        `${data.membershipEndDate ? `Membership valid until: ${formatDisplayDate(data.membershipEndDate)}` : ''}`,
        '',
        `Thank you for choosing ${getGymName(data.gymName)}.`,
    ]
        .filter(Boolean)
        .join('\n')
}

export function buildWelcomeNewMemberMessage(data: WelcomeNewMemberTemplateData) {
    return [
        `Welcome to ${getGymName(data.gymName)}, ${data.fullName}!`,
        '',
        `Your member ID is ${data.memberCode}.`,
        `${data.planName ? `Current plan: ${data.planName}` : 'Your membership plan will be shared with you shortly.'}`,
        `${data.membershipEndDate ? `Membership valid until: ${formatDisplayDate(data.membershipEndDate)}` : ''}`,
        '',
        'We are excited to be part of your fitness journey.',
    ]
        .filter(Boolean)
        .join('\n')
}

export function buildReferralRewardMessage(data: ReferralRewardTemplateData) {
    return [
        `Hi ${data.fullName},`,
        '',
        `You have earned ${data.rewardCoins} referral coins${data.referredMemberName ? ` for referring ${data.referredMemberName}` : ''}.`,
        'Your reward has been added to your account and can be used toward future membership payments.',
        '',
        `Thank you for growing the ${getGymName(data.gymName)} community.`,
    ].join('\n')
}

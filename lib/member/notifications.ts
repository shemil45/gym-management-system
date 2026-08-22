import type { MemberPortalData } from '@/lib/member/portal-data'

/**
 * Member-facing notification feed.
 *
 * Membership, payment and streak items are derived from the member's real
 * record. Gym announcements are mock data until an announcements table exists
 * for gym-to-member broadcasts (the platform announcements table targets gyms,
 * not members).
 */

export type NotificationKind = 'membership' | 'payment' | 'activity' | 'announcement'

export interface MemberNotification {
    id: string
    kind: NotificationKind
    title: string
    body: string
    at: string
    unread: boolean
    href?: string
    urgent?: boolean
}

/* mock: gym-to-member broadcast, pending a real announcements table */
const MOCK_ANNOUNCEMENTS: MemberNotification[] = [
    {
        id: 'ann-holiday-hours',
        kind: 'announcement',
        title: 'Weekend hours change',
        body: 'Saturday and Sunday the floor opens at 7:00 and closes at 20:00 through the end of the month.',
        at: new Date(Date.now() - 26 * 3600_000).toISOString(),
        unread: true,
    },
    {
        id: 'ann-new-rack',
        kind: 'announcement',
        title: 'Two new squat racks on the main floor',
        body: 'The free-weight area has been rebuilt. Barbell collars now live on the rack posts.',
        at: new Date(Date.now() - 4 * 86_400_000).toISOString(),
        unread: false,
    },
]

export function getNotifications(data: MemberPortalData): MemberNotification[] {
    const items: MemberNotification[] = []
    const { membership, payments, activity } = data

    if (membership.state === 'expired') {
        items.push({
            id: 'membership-expired',
            kind: 'membership',
            title: 'Your membership has expired',
            body: membership.expiryDate
                ? `It ended on ${formatShort(membership.expiryDate)}. Renew to keep your check-in access.`
                : 'Renew to restore your check-in access.',
            at: membership.expiryDate ?? new Date().toISOString(),
            unread: true,
            urgent: true,
            href: '/member/membership/renew',
        })
    } else if (membership.state === 'expiring' && membership.daysRemaining !== null) {
        items.push({
            id: 'membership-expiring',
            kind: 'membership',
            title: `${membership.daysRemaining} ${membership.daysRemaining === 1 ? 'day' : 'days'} left on your plan`,
            body: `Renew ${membership.planName ?? 'your membership'} before ${membership.expiryDate ? formatShort(membership.expiryDate) : 'it expires'} to avoid a gap.`,
            at: new Date().toISOString(),
            unread: true,
            urgent: true,
            href: '/member/membership/renew',
        })
    } else if (membership.state === 'frozen') {
        items.push({
            id: 'membership-frozen',
            kind: 'membership',
            title: 'Your membership is on hold',
            body: 'Check-ins are paused. Talk to the front desk when you want to restart.',
            at: new Date().toISOString(),
            unread: true,
            href: '/member/membership',
        })
    }

    if (payments.last) {
        items.push({
            id: `payment-${payments.last.id}`,
            kind: 'payment',
            title: `Payment received, ${formatMoney(payments.last.amount)}`,
            body: payments.last.receiptNumber
                ? `Receipt ${payments.last.receiptNumber} is ready to view.`
                : 'Your receipt is ready to view.',
            at: payments.last.date,
            unread: false,
            href: '/member/payments',
        })
    }

    if (activity.streak >= 3) {
        items.push({
            id: 'activity-streak',
            kind: 'activity',
            title: `${activity.streak}-day streak`,
            body: `You have trained ${activity.thisMonth} times this month. Keep it going.`,
            at: activity.lastCheckIn ?? new Date().toISOString(),
            unread: false,
            href: '/member/activity',
        })
    }

    return [...items, ...MOCK_ANNOUNCEMENTS].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    )
}

function formatShort(date: string) {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatMoney(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount)
}

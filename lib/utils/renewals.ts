import { todayInKolkata } from '@/lib/reports/dates'

type RenewalMember = {
    id: string
    membership_expiry_date?: string | null
}

/**
 * Business-day boundaries, always in Asia/Kolkata: computing them from the
 * server's local (typically UTC) calendar day would put "today" and "this
 * month" out of sync with the gym's actual wall clock for part of every day.
 */
export function getRenewalBoundaries(anchor = new Date()) {
    const todayValue = todayInKolkata(anchor)
    const [year, month] = todayValue.slice(0, 7).split('-').map(Number)
    const monthStartValue = `${todayValue.slice(0, 7)}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const nextMonthStartValue = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    return { todayValue, monthStartValue, nextMonthStartValue }
}

export function getExpiringMembers<T extends RenewalMember>(members: T[], anchor = new Date()) {
    const { todayValue, monthStartValue, nextMonthStartValue } = getRenewalBoundaries(anchor)

    return members
        .filter((member) => {
            const expiry = member.membership_expiry_date
            if (!expiry) return false
            return expiry >= todayValue && expiry >= monthStartValue && expiry < nextMonthStartValue
        })
        .sort((a, b) => (a.membership_expiry_date || '').localeCompare(b.membership_expiry_date || ''))
}

export function getOverdueMembers<T extends RenewalMember>(members: T[], anchor = new Date()) {
    const { todayValue } = getRenewalBoundaries(anchor)

    return members
        .filter((member) => {
            const expiry = member.membership_expiry_date
            if (!expiry) return false
            return expiry < todayValue
        })
        .sort((a, b) => (a.membership_expiry_date || '').localeCompare(b.membership_expiry_date || ''))
}

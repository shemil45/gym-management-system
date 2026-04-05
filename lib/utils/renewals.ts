type RenewalMember = {
    id: string
    membership_expiry_date?: string | null
}

export function getRenewalBoundaries(anchor = new Date()) {
    const today = new Date(anchor)
    today.setHours(0, 0, 0, 0)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)

    return {
        today,
        todayValue: today.toISOString().split('T')[0],
        monthStartValue: monthStart.toISOString().split('T')[0],
        nextMonthStartValue: nextMonthStart.toISOString().split('T')[0],
    }
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

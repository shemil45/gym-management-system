import 'server-only'

import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { gymHasFeature } from '@/lib/gym/features'
import { addDaysIso, rangeForPreset, todayInKolkata } from '@/lib/reports/dates'
import { countActiveMembers } from '@/lib/reports/member-counts'

// One headline number per landing card. Every value is a COUNT over a column
// the report modules already read — nothing is derived, estimated or invented.
// The queries are `head: true` counts (no rows returned) and all five run in
// parallel, so the whole set is one round trip; the landing page streams them
// in so the cards themselves still paint immediately.

export type LandingArea = 'payments' | 'expenses' | 'members' | 'attendance' | 'referrals'

/** `null` means "not available" — a failed count, or a module the gym can't use. */
export type LandingStats = Record<LandingArea, number | null>

function countOf(result: { count: number | null; error: unknown }): number | null {
    return result.error ? null : result.count ?? null
}

export const getLandingStats = cache(async (gymId: string): Promise<LandingStats> => {
    const db = getSupabaseAdmin()
    const today = todayInKolkata()
    // Calendar month to date, in IST — the same window the report modules use
    // for the "This month" preset.
    const month = rangeForPreset('month', today)

    // Resolved from the per-request feature cache the reports layout already
    // populated, so this costs nothing extra.
    const referralsOn = await gymHasFeature(gymId, 'referrals')

    const head = { count: 'exact' as const, head: true }

    const [payments, expenses, members, checkIns, referrals] = await Promise.all([
        db.from('payments').select('id', head).eq('gym_id', gymId)
            .eq('payment_status', 'paid')
            .gte('payment_date', month.from).lte('payment_date', month.to),
        db.from('expenses').select('id', head).eq('gym_id', gymId)
            .gte('expense_date', month.from).lte('expense_date', month.to),
        countActiveMembers(gymId, today),
        db.from('check_ins').select('id', head).eq('gym_id', gymId)
            .gte('check_in_time', `${month.from}T00:00:00+05:30`)
            .lt('check_in_time', `${addDaysIso(month.to, 1)}T00:00:00+05:30`),
        referralsOn
            ? db.from('referrals').select('id', head).eq('gym_id', gymId)
                .gte('created_at', `${month.from}T00:00:00+05:30`)
                .lt('created_at', `${addDaysIso(month.to, 1)}T00:00:00+05:30`)
            : null,
    ])

    return {
        payments: countOf(payments),
        expenses: countOf(expenses),
        members,
        attendance: countOf(checkIns),
        referrals: referrals ? countOf(referrals) : null,
    }
})

const NUMBER = new Intl.NumberFormat('en-IN')

function plural(count: number, one: string, many: string): string {
    return `${NUMBER.format(count)} ${count === 1 ? one : many}`
}

/** The metadata line under a card's description, or null when there is nothing real to show. */
export function landingStatLabel(area: LandingArea, stats: LandingStats): string | null {
    const value = stats[area]
    if (value === null) return null
    switch (area) {
        case 'payments': return `${plural(value, 'payment', 'payments')} this month`
        case 'expenses': return `${plural(value, 'expense', 'expenses')} this month`
        case 'members': return plural(value, 'active member', 'active members')
        case 'attendance': return `${plural(value, 'check-in', 'check-ins')} this month`
        case 'referrals': return `${plural(value, 'referral', 'referrals')} this month`
    }
}

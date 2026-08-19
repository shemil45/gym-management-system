import { cache } from 'react'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { readThroughGymCache, invalidateGymCache } from '@/lib/cache/durable-cache'

export const getCurrentAdminContext = cache(async () => {
    const context = await getCurrentGymContext()

    return {
        user: context.user,
        profile: context.profile,
        gym: context.gym,
        admin: context.admin,
        accessibleGyms: context.accessibleGyms,
        role: context.role,
        isStaff: context.isStaff,
    }
})

// ─── Gym-scoped admin summary cache ─────────────────────────────────────────
//
// Durable (cross-request) caches for dashboard-style numbers: member counts,
// payment totals, expiring memberships, recent check-in activity. These are
// informational aggregates, not authorization data, so a short TTL is an
// acceptable fallback here (unlike gym-context.ts, where the data gates
// access and isn't cached at all — see that file for why).
//
// Wiring status: getGymMemberCountSummary is called by
// lib/dashboard/getDashboardData.ts, and invalidateGymAdminSummaries is
// called by app/admin/members/actions.ts (createMember, updateMember,
// deleteMember) and app/admin/finances/payments/actions.ts (recordPayment)
// right after each successful write.
//
// getGymPaymentTotalsSummary and getGymExpiringMembershipsSummary are NOT
// called by the dashboard — its today/month revenue and expiring-today
// count are already derived for free from the 365-day payments query and
// the renewals list it fetches anyway (see getDashboardData.ts), so routing
// them through this cache instead would add lookup overhead without
// removing any DB round trip. They stay available here for other callers.
//
// getGymRecentActivitySummary (today's check-ins) is also not wired: the
// check-in insert/checkout mutations write directly from the client
// (CheckInsTable.tsx), not through a Server Action, so there's currently no
// server-side place to call invalidateGymAdminSummaries after them. Caching
// it without a covered invalidation path was deliberately deferred.

const ADMIN_SUMMARY_TTL_SECONDS = 30

function toSafeAmount(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
    return Number.isFinite(parsed) ? parsed : 0
}

function sumAmounts(rows: Array<{ amount: unknown }> | null | undefined) {
    return (rows ?? []).reduce((total, row) => total + toSafeAmount(row.amount), 0)
}

export async function getGymMemberCountSummary(gymId: string) {
    return readThroughGymCache(gymId, 'member-counts', ADMIN_SUMMARY_TTL_SECONDS, async () => {
        const admin = getSupabaseAdmin()
        const [{ count: totalMembers }, { count: activeMembers }] = await Promise.all([
            admin.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gymId),
            admin.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active'),
        ])

        return {
            totalMembers: totalMembers ?? 0,
            activeMembers: activeMembers ?? 0,
        }
    })
}

export async function getGymPaymentTotalsSummary(gymId: string) {
    return readThroughGymCache(gymId, 'payment-totals', ADMIN_SUMMARY_TTL_SECONDS, async () => {
        const admin = getSupabaseAdmin()
        const today = new Date().toISOString().split('T')[0]
        const monthStart = `${today.slice(0, 7)}-01`

        const [todayResult, monthResult] = await Promise.all([
            admin
                .from('payments')
                .select('amount')
                .eq('gym_id', gymId)
                .eq('payment_status', 'paid')
                .eq('payment_date', today),
            admin
                .from('payments')
                .select('amount')
                .eq('gym_id', gymId)
                .eq('payment_status', 'paid')
                .gte('payment_date', monthStart)
                .lte('payment_date', today),
        ])

        return {
            todayRevenue: sumAmounts(todayResult.data as Array<{ amount: unknown }> | null),
            monthRevenue: sumAmounts(monthResult.data as Array<{ amount: unknown }> | null),
        }
    })
}

export async function getGymExpiringMembershipsSummary(gymId: string) {
    return readThroughGymCache(gymId, 'expiring-memberships', ADMIN_SUMMARY_TTL_SECONDS, async () => {
        const admin = getSupabaseAdmin()
        const today = new Date().toISOString().split('T')[0]
        const { count } = await admin
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .eq('status', 'active')
            .eq('membership_expiry_date', today)

        return { expiringToday: count ?? 0 }
    })
}

export async function getGymRecentActivitySummary(gymId: string) {
    return readThroughGymCache(gymId, 'recent-activity', ADMIN_SUMMARY_TTL_SECONDS, async () => {
        const admin = getSupabaseAdmin()
        const today = new Date().toISOString().split('T')[0]
        const { count } = await admin
            .from('check_ins')
            .select('*', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .gte('check_in_time', `${today}T00:00:00`)
            .lt('check_in_time', `${today}T23:59:59`)

        return { todayCheckIns: count ?? 0 }
    })
}

/**
 * Invalidates every gym-scoped admin summary cache entry for a gym. Call
 * this from a Server Action or Route Handler immediately after a database
 * write that could change any of the summaries above (a member added or
 * removed, a payment recorded, a check-in logged, etc). Not yet called
 * anywhere in this phase — see the scope note above.
 */
export function invalidateGymAdminSummaries(gymId: string) {
    invalidateGymCache(gymId, 'member-counts')
    invalidateGymCache(gymId, 'payment-totals')
    invalidateGymCache(gymId, 'expiring-memberships')
    invalidateGymCache(gymId, 'recent-activity')
}

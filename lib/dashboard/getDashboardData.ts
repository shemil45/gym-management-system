'use server'

import { createClient } from '@/lib/supabase/server'
import { getExpiringMembers, getOverdueMembers } from '@/lib/utils/renewals'

export interface DashboardData {
    totalMembers: number
    activeMembers: number
    pendingCollection: number
    todayRevenue: number
    monthRevenue: number
    monthExpenses: number
    todayPaymentsCount: number
    todayCheckIns: number
    expiringCount: number
    revenueChart: { date: string; revenue: number }[]
    renewals: {
        id: string
        full_name: string
        member_id: string
        photo_url: string | null
        status: string
        membership_expiry_date: string | null
        membership_plan?: { name: string; price: number } | null
    }[]
}

export interface ViewerProfile {
    email: string | null
    full_name: string | null
    phone: string | null
    photo_url: string | null
    role: string | null
}

interface ProfileRow {
    full_name: string | null
    role: string | null
    phone: string | null
    photo_url: string | null
}

function toSafeAmount(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
    return Number.isFinite(parsed) ? parsed : 0
}

function sumAmounts(rows: Array<{ amount: unknown }> | null | undefined) {
    return (rows || []).reduce((sum, row) => sum + toSafeAmount(row.amount), 0)
}

export async function getDashboardData(): Promise<{
    viewerProfile: ViewerProfile | null
    data: DashboardData
}> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const today = new Date().toISOString().split('T')[0]
    const monthStart = `${today.slice(0, 7)}-01`
    const days = Array.from({ length: 365 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (364 - i))
        return d.toISOString().split('T')[0]
    })

    const profilePromise = user
        ? supabase.from('profiles').select('full_name, role, phone, photo_url').eq('id', user.id).maybeSingle()
        : Promise.resolve({ data: null as ProfileRow | null })

    const [
        profileResult,
        { count: totalMembers },
        { count: activeMembers },
        { count: todayCheckIns },
        { data: monthExpensesRows },
        { data: renewalMembers },
        { data: allPayments },
    ] = await Promise.all([
        profilePromise,
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
            .from('check_ins')
            .select('*', { count: 'exact', head: true })
            .gte('check_in_time', `${today}T00:00:00`)
            .lt('check_in_time', `${today}T23:59:59`),
        supabase
            .from('expenses')
            .select('amount')
            .gte('expense_date', monthStart)
            .lte('expense_date', today),
        supabase
            .from('members')
            .select(`
                id,
                full_name,
                member_id,
                photo_url,
                status,
                membership_expiry_date,
                membership_plan:membership_plans(name, price)
            `)
            .not('membership_expiry_date', 'is', null)
            .order('membership_expiry_date', { ascending: true }),
        supabase
            .from('payments')
            .select('amount, payment_date')
            .eq('payment_status', 'paid')
            .gte('payment_date', days[0])
            .lte('payment_date', today),
    ])

    let viewerProfile: ViewerProfile | null = null
    if (user) {
        const profile = profileResult.data as ProfileRow | null
        viewerProfile = {
            email: user.email ?? null,
            full_name: profile?.full_name ?? user.email?.split('@')[0] ?? null,
            phone: profile?.phone ?? null,
            photo_url: profile?.photo_url ?? null,
            role: profile?.role ?? null,
        }
    }

    const paymentsRows = (allPayments as { payment_date: string; amount: unknown }[] | null) || []

    const revenueByDate: Record<string, number> = {}
    paymentsRows.forEach((payment) => {
        revenueByDate[payment.payment_date] = (revenueByDate[payment.payment_date] || 0) + toSafeAmount(payment.amount)
    })

    const revenueChart = days.map((day) => ({
        date: new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        revenue: revenueByDate[day] || 0,
    }))

    // today's and this month's payments are both subsets of the 365-day
    // window already fetched above, so no separate queries are needed.
    const todayPaymentsRows = paymentsRows.filter((payment) => payment.payment_date === today)
    const monthPaymentsRows = paymentsRows.filter(
        (payment) => payment.payment_date >= monthStart && payment.payment_date <= today
    )

    const normalizedRenewalMembers = (renewalMembers || []) as DashboardData['renewals']

    // members expiring today are already present in renewalMembers, so the
    // count is derived instead of running a dedicated query.
    const expiringCount = normalizedRenewalMembers.filter(
        (member) => member.status === 'active' && member.membership_expiry_date === today
    ).length

    const expiringRenewals = getExpiringMembers(normalizedRenewalMembers)
    const overdueRenewals = getOverdueMembers(normalizedRenewalMembers)
    const combinedRenewals = [...expiringRenewals, ...overdueRenewals]
    const uniqueRenewals = Array.from(new Map(combinedRenewals.map((member) => [member.id, member])).values())
    const pendingCollection = uniqueRenewals.reduce(
        (sum, member) => sum + Number(member.membership_plan?.price || 0),
        0
    )

    const data: DashboardData = {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        pendingCollection,
        todayRevenue: sumAmounts(todayPaymentsRows as Array<{ amount: unknown }>),
        monthRevenue: sumAmounts(monthPaymentsRows as Array<{ amount: unknown }>),
        monthExpenses: sumAmounts(monthExpensesRows as Array<{ amount: unknown }> | null),
        todayPaymentsCount: todayPaymentsRows.length,
        todayCheckIns: todayCheckIns || 0,
        expiringCount,
        revenueChart,
        renewals: normalizedRenewalMembers,
    }

    return { viewerProfile, data }
}

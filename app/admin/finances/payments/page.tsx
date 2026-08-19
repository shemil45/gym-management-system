import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import PaymentsTable from '@/components/tables/PaymentsTable'

const ITEMS_PER_PAGE = 20

type PaymentAggregateRow = {
    total: number | null
}

type PaymentTableRow = {
    id: string
    member_id: string
    amount: number
    payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
    payment_status: 'paid' | 'pending' | 'failed' | 'refunded'
    payment_date: string
    invoice_number: string | null
    notes: string | null
    created_at: string
    member: {
        id: string
        member_id: string
        full_name: string
        photo_url: string | null
        membership_start_date: string | null
        membership_expiry_date: string | null
        membership_plan: { name: string } | null
    } | null
}

type FinancesPaymentsPageProps = {
    searchParams: Promise<{
        page?: string
        q?: string
        status?: string
        date?: string
        method?: string
        dateFrom?: string
        dateTo?: string
        type?: string
    }>
}

function getPage(value: string | undefined) {
    const page = Number(value ?? '1')
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

function getPresetDateRange(preset: string | undefined) {
    const today = new Date()
    const todayValue = today.toISOString().split('T')[0]

    if (preset === 'today') {
        return { from: todayValue, to: todayValue }
    }

    if (preset === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        return { from: monthStart, to: todayValue }
    }

    return { from: '', to: '' }
}

async function getPaidPaymentTotal(
    supabase: Awaited<ReturnType<typeof createClient>>,
    filters: { date?: string; from?: string }
) {
    let query = supabase
        .from('payments')
        .select('total:amount.sum()')
        .eq('payment_status', 'paid')

    if (filters.date) {
        query = query.eq('payment_date', filters.date)
    }

    if (filters.from) {
        query = query.gte('payment_date', filters.from)
    }

    const result = await query
    const { data } = result as unknown as QueryResult<PaymentAggregateRow[] | null>
    return Number(data?.[0]?.total ?? 0)
}

export default async function FinancesPaymentsPage({ searchParams }: FinancesPaymentsPageProps) {
    const params = await searchParams
    const supabase = await createClient()
    const page = getPage(params.page)
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    const query = params.q?.trim() ?? ''
    const presetDateRange = getPresetDateRange(params.date)
    const dateFrom = params.dateFrom ?? presetDateRange.from
    const dateTo = params.dateTo ?? presetDateRange.to
    const status = params.status || 'all'
    const method = params.method || 'all'

    let matchingMemberIds: string[] = []
    if (query) {
        const matchingMembersResult = await supabase
            .from('members')
            .select('id')
            .or(`full_name.ilike.%${query}%,member_id.ilike.%${query}%`)
        const { data: matchingMembers } = matchingMembersResult as unknown as QueryResult<Array<{ id: string }> | null>
        matchingMemberIds = (matchingMembers ?? []).map((member) => member.id)
    }

    let paymentsQuery = supabase
        .from('payments')
        .select(`
            id,
            member_id,
            amount,
            payment_method,
            payment_status,
            payment_date,
            invoice_number,
            notes,
            created_at,
            member:members(
                id,
                member_id,
                full_name,
                photo_url,
                membership_start_date,
                membership_expiry_date,
                membership_plan:membership_plans(name)
            )
        `, { count: 'exact' })

    if (query) {
        const searchParts = [`invoice_number.ilike.%${query}%`]
        if (matchingMemberIds.length > 0) {
            searchParts.push(`member_id.in.(${matchingMemberIds.join(',')})`)
        }
        paymentsQuery = paymentsQuery.or(searchParts.join(','))
    }

    if (status !== 'all') {
        paymentsQuery = paymentsQuery.eq('payment_status', status)
    }

    if (method !== 'all') {
        paymentsQuery = paymentsQuery.eq('payment_method', method)
    }

    if (dateFrom) {
        paymentsQuery = paymentsQuery.gte('payment_date', dateFrom)
    }

    if (dateTo) {
        paymentsQuery = paymentsQuery.lte('payment_date', dateTo)
    }

    const paymentsResult = await paymentsQuery
        .order('created_at', { ascending: false })
        .range(from, to)
    const { data: payments } = paymentsResult as unknown as QueryResult<PaymentTableRow[] | null>
    const totalPayments = paymentsResult.count ?? 0

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0]

    const [todayTotal, monthTotal, totalRevenue] = await Promise.all([
        getPaidPaymentTotal(supabase, { date: today }),
        getPaidPaymentTotal(supabase, { from: monthStart }),
        getPaidPaymentTotal(supabase, {}),
    ])

    return (
        <PaymentsTable
            key={`${params.status || 'all'}:${params.date || 'none'}:${params.method || 'all'}:${dateFrom}:${dateTo}:${params.type || 'none'}`}
            payments={payments || []}
            todayTotal={todayTotal}
            monthTotal={monthTotal}
            totalRevenue={totalRevenue}
            currentPage={page}
            totalCount={totalPayments}
            initialFilters={{
                q: params.q,
                status: params.status,
                date: params.date,
                method: params.method,
                dateFrom,
                dateTo,
                type: params.type,
            }}
        />
    )
}

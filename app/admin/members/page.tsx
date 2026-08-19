import { createClient } from '@/lib/supabase/server'
import MembersTable from '@/components/tables/MembersTable'
import { getRenewalBoundaries } from '@/lib/utils/renewals'

const ITEMS_PER_PAGE = 20

type MembersPageProps = {
    searchParams: Promise<{
        page?: string
        q?: string
        status?: string
        plan?: string
        gender?: string
        startFrom?: string
        startTo?: string
        endFrom?: string
        endTo?: string
        planExpiry?: string
        filter?: string
    }>
}

function getPage(value: string | undefined) {
    const page = Number(value ?? '1')
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
    const params = await searchParams
    const supabase = await createClient()
    const page = getPage(params.page)
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    const query = params.q?.trim() ?? ''
    const status = params.status || 'all'
    const plan = params.plan || 'all'
    const gender = params.gender || 'all'
    const renewalFilter = params.filter || 'all'
    const { todayValue, monthStartValue, nextMonthStartValue } = getRenewalBoundaries()
    const endFrom = params.endFrom ?? (params.planExpiry === 'today' ? todayValue : '')
    const endTo = params.endTo ?? (params.planExpiry === 'today' ? todayValue : '')

    let membersQuery = supabase
        .from('members')
        .select(`
            id,
            member_id,
            full_name,
            phone,
            email,
            photo_url,
            status,
            gender,
            membership_start_date,
            membership_expiry_date,
            membership_plan_id,
            membership_plan:membership_plans(id, name, price)
        `, { count: 'exact' })

    if (query) {
        membersQuery = membersQuery.or(`full_name.ilike.%${query}%,member_id.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    }

    if (status !== 'all') {
        membersQuery = membersQuery.eq('status', status)
    }

    if (plan !== 'all') {
        membersQuery = membersQuery.eq('membership_plan_id', plan)
    }

    if (gender !== 'all') {
        membersQuery = membersQuery.ilike('gender', gender)
    }

    if (params.startFrom) {
        membersQuery = membersQuery.gte('membership_start_date', params.startFrom)
    }

    if (params.startTo) {
        membersQuery = membersQuery.lte('membership_start_date', params.startTo)
    }

    if (endFrom) {
        membersQuery = membersQuery.gte('membership_expiry_date', endFrom)
    }

    if (endTo) {
        membersQuery = membersQuery.lte('membership_expiry_date', endTo)
    }

    if (renewalFilter === 'expires') {
        membersQuery = membersQuery
            .gte('membership_expiry_date', todayValue)
            .gte('membership_expiry_date', monthStartValue)
            .lt('membership_expiry_date', nextMonthStartValue)
    } else if (renewalFilter === 'overdue') {
        membersQuery = membersQuery.lt('membership_expiry_date', todayValue)
    } else if (renewalFilter === 'renewals') {
        membersQuery = membersQuery
            .not('membership_expiry_date', 'is', null)
            .lt('membership_expiry_date', nextMonthStartValue)
    }

    const { data: members, count: totalMembers } = await membersQuery
        .order(renewalFilter === 'all' ? 'created_at' : 'membership_expiry_date', {
            ascending: renewalFilter !== 'all',
            nullsFirst: false,
        })
        .range(from, to)

    // Fetch all plans for filter dropdown
    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name')
        .order('name')

    return (
        <MembersTable
            key={`${params.status || 'all'}:${params.plan || 'all'}:${params.gender || 'all'}:${params.startFrom || ''}:${params.startTo || ''}:${endFrom}:${endTo}:${params.planExpiry || 'none'}:${params.filter || 'none'}`}
            members={members || []}
            plans={plans || []}
            currentPage={page}
            totalCount={totalMembers || 0}
            initialFilters={{
                q: params.q,
                status: params.status,
                plan: params.plan,
                gender: params.gender,
                startFrom: params.startFrom,
                startTo: params.startTo,
                endFrom,
                endTo,
                planExpiry: params.planExpiry,
                filter: params.filter,
            }}
        />
    )
}

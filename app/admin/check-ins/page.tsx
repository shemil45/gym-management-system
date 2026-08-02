import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import CheckInsTable from '@/components/tables/CheckInsTable'

const ITEMS_PER_PAGE = 20

type CheckInsPageProps = {
    searchParams: Promise<{
        page?: string
        q?: string
        date?: string
        method?: string
    }>
}

function getPage(value: string | undefined) {
    const page = Number(value ?? '1')
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

function getTodayRange() {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start: start.toISOString(), end: end.toISOString() }
}

export default async function CheckInsPage({ searchParams }: CheckInsPageProps) {
    const params = await searchParams
    const supabase = await createClient()
    const page = getPage(params.page)
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    const query = params.q?.trim() ?? ''
    const dateFilter = params.date || 'today'
    const methodFilter = params.method || 'all'
    const todayRange = getTodayRange()
    const weekAgo = new Date()
    weekAgo.setTime(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000)

    let matchingMemberIds: string[] = []
    if (query) {
        const matchingMembersResult = await supabase
            .from('members')
            .select('id')
            .or(`full_name.ilike.%${query}%,member_id.ilike.%${query}%`)
        const { data: matchingMembers } = matchingMembersResult as unknown as QueryResult<Array<{ id: string }> | null>
        matchingMemberIds = (matchingMembers ?? []).map((member) => member.id)
    }

    let checkInsQuery = supabase
        .from('check_ins')
        .select(`
            id,
            member_id,
            check_in_time,
            check_out_time,
            entry_method,
            notes,
            member:members(
                id,
                member_id,
                full_name,
                photo_url,
                status,
                membership_plan:membership_plans(name)
            )
        `, { count: 'exact' })

    if (query) {
        if (matchingMemberIds.length > 0) {
            checkInsQuery = checkInsQuery.in('member_id', matchingMemberIds)
        } else {
            checkInsQuery = checkInsQuery.eq('member_id', '00000000-0000-0000-0000-000000000000')
        }
    }

    if (dateFilter === 'today') {
        checkInsQuery = checkInsQuery
            .gte('check_in_time', todayRange.start)
            .lt('check_in_time', todayRange.end)
    } else if (dateFilter === 'week') {
        checkInsQuery = checkInsQuery.gte('check_in_time', weekAgo.toISOString())
    }

    if (methodFilter !== 'all') {
        checkInsQuery = checkInsQuery.eq('entry_method', methodFilter)
    }

    const { data: checkIns, count: totalCheckIns } = await checkInsQuery
        .order('check_in_time', { ascending: false })
        .range(from, to)

    const [todayCountResult, currentlyInResult, weekCountResult] = await Promise.all([
        supabase
            .from('check_ins')
            .select('id', { count: 'exact', head: true })
            .gte('check_in_time', todayRange.start)
            .lt('check_in_time', todayRange.end),
        supabase
            .from('check_ins')
            .select('id', { count: 'exact', head: true })
            .gte('check_in_time', todayRange.start)
            .lt('check_in_time', todayRange.end)
            .is('check_out_time', null),
        supabase
            .from('check_ins')
            .select('id', { count: 'exact', head: true })
            .gte('check_in_time', weekAgo.toISOString()),
    ])

    // Active members for the manual check-in dropdown
    const { data: activeMembers } = await supabase
        .from('members')
        .select('id, member_id, full_name, photo_url, status')
        .eq('status', 'active')
        .order('full_name')

    return (
        <CheckInsTable
            key={`${params.page || '1'}:${params.q || ''}:${params.date || 'today'}:${params.method || 'all'}`}
            checkIns={checkIns || []}
            activeMembers={activeMembers || []}
            currentPage={page}
            totalCount={totalCheckIns || 0}
            stats={{
                todayCount: todayCountResult.count || 0,
                currentlyIn: currentlyInResult.count || 0,
                weekCount: weekCountResult.count || 0,
            }}
            initialFilters={{
                q: params.q,
                date: params.date,
                method: params.method,
            }}
        />
    )
}

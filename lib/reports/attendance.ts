import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { addDaysIso, type DateRange } from '@/lib/reports/dates'
import { fetchMembers } from '@/lib/reports/members'
import type { AttendanceReportQuery } from '@/lib/reports/attendance-params'
import {
    byMember, footfallBuckets, footfallKpis, footfallTotals, heatmap, toVisit,
    type CheckInRow, type FootfallBucket, type FootfallKpis, type Heatmap,
    type MemberAttendanceRow, type MemberSort, type Visit,
} from '@/lib/reports/attendance-aggregate'

const PAGE_SIZE = 1000

export async function fetchCheckIns(gymId: string, range: DateRange): Promise<CheckInRow[]> {
    const db = getSupabaseAdmin()
    const fetchPage = (from: number, to: number) =>
        db.from('check_ins').select('id, member_id, check_in_time, check_out_time, entry_method').eq('gym_id', gymId)
            .gte('check_in_time', `${range.from}T00:00:00+05:30`)
            .lt('check_in_time', `${addDaysIso(range.to, 1)}T00:00:00+05:30`)
            .order('check_in_time', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to)

    const firstPage = await fetchPage(0, PAGE_SIZE - 1)
    if (firstPage.error) throw new Error(`Attendance report query failed: ${firstPage.error.message}`)
    const raw: CheckInRow[] = [...((firstPage.data ?? []) as unknown as CheckInRow[])]
    let page = 1
    let lastSize = raw.length
    while (lastSize === PAGE_SIZE) {
        const result = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (result.error) throw new Error(`Attendance report query failed: ${result.error.message}`)
        const rows = (result.data ?? []) as unknown as CheckInRow[]
        raw.push(...rows)
        lastSize = rows.length
        page += 1
    }
    return raw
}

export type FootfallReport = {
    buckets: FootfallBucket[]
    totals: ReturnType<typeof footfallTotals>
    kpis: FootfallKpis
    previous: FootfallKpis
}

export type ByMemberReport = { rows: MemberAttendanceRow[]; sort: MemberSort; totalVisits: number }

export type HeatmapReport = Heatmap

function withMember(row: CheckInRow): row is CheckInRow & { member_id: string } {
    return row.member_id !== null
}

export async function getFootfall(gymId: string, query: AttendanceReportQuery): Promise<FootfallReport> {
    const [currentRows, previousRows] = await Promise.all([
        fetchCheckIns(gymId, query.range),
        fetchCheckIns(gymId, query.previous),
    ])
    const visits: Visit[] = currentRows.filter(withMember).map(toVisit)
    const previousVisits: Visit[] = previousRows.filter(withMember).map(toVisit)
    const buckets = footfallBuckets(visits, query.range, query.bucket)
    return {
        buckets,
        totals: footfallTotals(buckets, visits, query.range),
        kpis: footfallKpis(visits, query.range),
        previous: footfallKpis(previousVisits, query.previous),
    }
}

export async function getByMember(gymId: string, query: AttendanceReportQuery): Promise<ByMemberReport> {
    const [rows, members] = await Promise.all([
        fetchCheckIns(gymId, query.range),
        fetchMembers(gymId),
    ])
    const visits: Visit[] = rows.filter(withMember).map(toVisit)
    const memberRows = byMember(visits, members, query.today, query.sort)
    return { rows: memberRows, sort: query.sort, totalVisits: visits.length }
}

export async function getHeatmap(gymId: string, query: AttendanceReportQuery): Promise<HeatmapReport> {
    const rows = await fetchCheckIns(gymId, query.range)
    const visits: Visit[] = rows.filter(withMember).map(toVisit)
    return heatmap(visits)
}

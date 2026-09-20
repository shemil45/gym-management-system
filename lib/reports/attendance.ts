import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { addDaysIso, type DateRange } from '@/lib/reports/dates'
import { fetchMembers } from '@/lib/reports/members'
import type { AttendanceReportQuery } from '@/lib/reports/attendance-params'
import {
    activeWeeks, byHour, byMember, byWeekday, entryMethodRows, firstThirtyDays, footfallBuckets, footfallKpis, footfallTotals, heatmap,
    memberSummary, peakSummary, segments, toVisit, visitFrequency,
    type CheckInRow, type EntryMethodRow, type FootfallBucket, type FootfallKpis, type FrequencyBucket, type Heatmap, type HourRow,
    type MemberAttendanceRow, type MemberSort, type MemberSummary, type OnboardingReport, type PeakSummary, type SegmentRow,
    type Visit, type WeekdayRow,
} from '@/lib/reports/attendance-aggregate'
import type { Comparison } from '@/lib/reports/comparison'

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

/**
 * Every report below is built from the check-ins the tab already fetched
 * (plus the roster on By member). The analytics fields are further views of
 * those same visits; no tab fetches more than it did before this layer.
 */
export type FootfallReport = {
    buckets: FootfallBucket[]
    totals: ReturnType<typeof footfallTotals>
    kpis: FootfallKpis
    previous: FootfallKpis | null
    compare: Comparison
    comparisonBuckets: FootfallBucket[] | null
    /** Visits with a recorded check-out — what `avgMinutes` is averaged over. */
    withDuration: number
    frequency: FrequencyBucket[]
    methods: EntryMethodRow[]
    hours: HourRow[]
    weekdays: WeekdayRow[]
    peaks: PeakSummary
    previousPeaks: PeakSummary | null
}

export type ByMemberReport = {
    rows: MemberAttendanceRow[]
    sort: MemberSort
    totalVisits: number
    summary: MemberSummary
    /** Distinct weeks each member visited in, keyed by member id. */
    weeks: Record<string, number>
    segments: SegmentRow[]
    onboarding: OnboardingReport
}

export type HeatmapReport = Heatmap & { peaks: PeakSummary; weekdays: WeekdayRow[] }

function withMember(row: CheckInRow): row is CheckInRow & { member_id: string } {
    return row.member_id !== null
}

export async function getFootfall(gymId: string, query: AttendanceReportQuery): Promise<FootfallReport> {
    const [currentRows, previousRows] = await Promise.all([
        fetchCheckIns(gymId, query.range),
        query.previous ? fetchCheckIns(gymId, query.previous) : Promise.resolve(null),
    ])
    const visits: Visit[] = currentRows.filter(withMember).map(toVisit)
    const previousVisits: Visit[] | null = previousRows ? previousRows.filter(withMember).map(toVisit) : null
    const buckets = footfallBuckets(visits, query.range, query.bucket)
    const totals = footfallTotals(buckets, visits, query.range)
    return {
        buckets,
        totals,
        kpis: footfallKpis(visits, query.range),
        previous: previousVisits && query.previous ? footfallKpis(previousVisits, query.previous) : null,
        compare: query.compare,
        comparisonBuckets: previousVisits && query.previous ? footfallBuckets(previousVisits, query.previous, query.bucket) : null,
        withDuration: visits.filter((v) => v.minutes !== null).length,
        frequency: visitFrequency(visits),
        methods: entryMethodRows(totals.byMethod),
        hours: byHour(visits),
        weekdays: byWeekday(visits, query.range),
        peaks: peakSummary(visits, query.range),
        previousPeaks: previousVisits && query.previous ? peakSummary(previousVisits, query.previous) : null,
    }
}

export async function getByMember(gymId: string, query: AttendanceReportQuery): Promise<ByMemberReport> {
    const [rows, members] = await Promise.all([
        fetchCheckIns(gymId, query.range),
        fetchMembers(gymId),
    ])
    const visits: Visit[] = rows.filter(withMember).map(toVisit)
    const memberRows = byMember(visits, members, query.today, query.sort)
    return {
        rows: memberRows,
        sort: query.sort,
        totalVisits: visits.length,
        summary: memberSummary(memberRows, visits, query.range),
        weeks: Object.fromEntries(activeWeeks(visits, query.range)),
        segments: segments(memberRows, members, query.range, query.today),
        onboarding: firstThirtyDays(visits, members, query.range),
    }
}

export async function getHeatmap(gymId: string, query: AttendanceReportQuery): Promise<HeatmapReport> {
    const rows = await fetchCheckIns(gymId, query.range)
    const visits: Visit[] = rows.filter(withMember).map(toVisit)
    return { ...heatmap(visits), peaks: peakSummary(visits, query.range), weekdays: byWeekday(visits, query.range) }
}

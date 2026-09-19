import { chooseBucket, isIsoDate, previousRange, rangeForPreset, type Bucket, type DateRange, type Preset } from '@/lib/reports/dates'
import { periodSearchParams } from '@/lib/reports/period-params'
import type { RawParams } from '@/lib/reports/payments-params'

export type { RawParams }

export type AttendanceTab = 'footfall' | 'members' | 'heatmap'

export const ATTENDANCE_TABS: { id: AttendanceTab; label: string }[] = [
    { id: 'footfall', label: 'Footfall' },
    { id: 'members', label: 'By member' },
    { id: 'heatmap', label: 'Heat map' },
]

export type MemberSort = 'most' | 'least' | 'gap'

export const MEMBER_SORTS: { id: MemberSort; label: string }[] = [
    { id: 'most', label: 'Most visits' },
    { id: 'least', label: 'Least visits' },
    { id: 'gap', label: 'Longest gap' },
]

export type AttendanceReportQuery = {
    tab: AttendanceTab
    preset: Preset
    range: DateRange
    previous: DateRange
    bucket: Bucket
    sort: MemberSort
    today: string
}

const TABS = new Set<string>(ATTENDANCE_TABS.map((tab) => tab.id))
const SORTS = new Set<string>(MEMBER_SORTS.map((sort) => sort.id))
const PRESETS = new Set<string>(['week', 'month', 'year', 'custom'])
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function parseAttendanceParams(raw: RawParams, today: string): AttendanceReportQuery {
    const tabValue = first(raw.tab)
    const tab: AttendanceTab = tabValue && TABS.has(tabValue) ? (tabValue as AttendanceTab) : 'footfall'

    const presetValue = first(raw.preset)
    let preset: Preset = presetValue && PRESETS.has(presetValue) ? (presetValue as Preset) : 'month'
    const from = first(raw.from)
    const to = first(raw.to)
    let range: DateRange
    if (preset === 'custom' && isIsoDate(from) && isIsoDate(to) && from <= to) {
        range = { from, to }
    } else {
        preset = preset === 'custom' ? 'month' : preset
        range = rangeForPreset(preset, today)
    }

    const sortValue = first(raw.sort)
    const sort: MemberSort = tab === 'members' && sortValue && SORTS.has(sortValue) ? (sortValue as MemberSort) : 'most'

    return { tab, preset, range, previous: previousRange(range), bucket: chooseBucket(range), sort, today }
}

export function attendanceSearchParams(q: AttendanceReportQuery): URLSearchParams {
    const params = periodSearchParams(q)
    if (q.tab === 'members') params.set('sort', q.sort)
    return params
}

export function attendanceExportFilename(q: AttendanceReportQuery): string {
    return `attendance-${q.tab}-${q.range.from}-${q.range.to}.csv`
}

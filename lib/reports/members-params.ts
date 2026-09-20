import { chooseBucket, isIsoDate, rangeForPreset, type Bucket, type DateRange, type Preset } from '@/lib/reports/dates'
import { COMPARISON_PARAM, DEFAULT_COMPARISON, comparisonRange, parseComparison, type Comparison } from '@/lib/reports/comparison'
import type { RawParams } from '@/lib/reports/payments-params'

export type { RawParams }
export type MembersTab = 'joins' | 'renewals' | 'retention' | 'roster' | 'inactive'
export const MEMBERS_TABS: { id: MembersTab; label: string }[] = [
    { id: 'joins', label: 'New joins' },
    { id: 'renewals', label: 'Renewals due' },
    { id: 'retention', label: 'Retention' },
    { id: 'roster', label: 'Roster' },
    { id: 'inactive', label: 'Inactive' },
]
export type Horizon = 7 | 15 | 30
export type InactiveDays = 7 | 14 | 30
export const HORIZONS: Horizon[] = [7, 15, 30]
export const INACTIVE_DAYS: InactiveDays[] = [7, 14, 30]

export type MembersReportQuery = {
    tab: MembersTab
    preset: Preset
    range: DateRange
    /** What a period tab compares against. Ranges come from `comparisonRange`. */
    compare: Comparison
    /** The comparison window, or null when `compare` is `none`. */
    previous: DateRange | null
    bucket: Bucket
    horizon: Horizon
    lapsed: boolean
    days: InactiveDays
    today: string
}

const TABS = new Set<string>(MEMBERS_TABS.map((t) => t.id))
const PRESETS = new Set<string>(['week', 'month', 'year', 'custom'])
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
function pick<T extends number>(value: string | undefined, allowed: T[], fallback: T): T {
    const n = Number(value)
    return (allowed as number[]).includes(n) ? (n as T) : fallback
}

export function parseMembersParams(raw: RawParams, today: string): MembersReportQuery {
    const tabValue = first(raw.tab)
    const tab: MembersTab = tabValue && TABS.has(tabValue) ? (tabValue as MembersTab) : 'joins'
    const presetValue = first(raw.preset)
    let preset: Preset = presetValue && PRESETS.has(presetValue) ? (presetValue as Preset) : 'month'
    const from = first(raw.from)
    const to = first(raw.to)
    let range: DateRange
    if (preset === 'custom' && isIsoDate(from) && isIsoDate(to) && from <= to) range = { from, to }
    else { preset = preset === 'custom' ? 'month' : preset; range = rangeForPreset(preset, today) }
    const compare = parseComparison(raw[COMPARISON_PARAM])
    return {
        tab, preset, range, compare, previous: comparisonRange(range, compare), bucket: chooseBucket(range),
        horizon: pick(first(raw.horizon), HORIZONS, 30),
        lapsed: first(raw.lapsed) === '1',
        days: pick(first(raw.days), INACTIVE_DAYS, 14),
        today,
    }
}

function periodInto(params: URLSearchParams, q: MembersReportQuery) {
    params.set('preset', q.preset)
    if (q.preset === 'custom') { params.set('from', q.range.from); params.set('to', q.range.to) }
}

export function membersSearchParams(q: MembersReportQuery): URLSearchParams {
    const params = new URLSearchParams({ tab: q.tab })
    switch (q.tab) {
        case 'joins':
        case 'retention':
            periodInto(params, q); break
        case 'renewals':
            params.set('horizon', String(q.horizon))
            if (q.lapsed) { params.set('lapsed', '1'); periodInto(params, q) }
            break
        case 'inactive':
            params.set('days', String(q.days)); break
        case 'roster':
            break
    }
    // Carried on every tab so a comparison chosen on New joins is still there
    // after a detour through the roster. The default stays out of the URL.
    if (q.compare !== DEFAULT_COMPARISON) params.set(COMPARISON_PARAM, q.compare)
    return params
}

export function membersExportFilename(q: MembersReportQuery): string {
    switch (q.tab) {
        case 'renewals': return q.lapsed ? `members-renewals-lapsed-${q.range.from}-${q.range.to}.csv` : `members-renewals-next${q.horizon}d-${q.today}.csv`
        case 'roster': return `members-roster-${q.today}.csv`
        case 'inactive': return `members-inactive-${q.days}d-${q.today}.csv`
        default: return `members-${q.tab}-${q.range.from}-${q.range.to}.csv`
    }
}

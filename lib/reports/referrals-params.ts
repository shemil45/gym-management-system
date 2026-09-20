import { chooseBucket, isIsoDate, rangeForPreset, type Bucket, type DateRange, type Preset } from '@/lib/reports/dates'
import { COMPARISON_PARAM, DEFAULT_COMPARISON, comparisonRange, parseComparison, type Comparison } from '@/lib/reports/comparison'
import { periodSearchParams } from '@/lib/reports/period-params'
import type { RawParams } from '@/lib/reports/payments-params'

export type { RawParams }

export type ReferralsTab = 'overview' | 'leaderboard' | 'list'

export const REFERRALS_TABS: { id: ReferralsTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'list', label: 'Referrals' },
]

export type ListStatus = 'all' | 'pending' | 'applied' | 'expired'

export const LIST_STATUSES: { id: ListStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'applied', label: 'Applied' },
    { id: 'expired', label: 'Expired' },
]

export type ReferralsReportQuery = {
    tab: ReferralsTab
    preset: Preset
    range: DateRange
    /** What the Overview compares against. Ranges come from `comparisonRange`. */
    compare: Comparison
    /** The comparison window, or null when `compare` is `none`. */
    previous: DateRange | null
    bucket: Bucket
    status: ListStatus
    today: string
}

const TABS = new Set<string>(REFERRALS_TABS.map((tab) => tab.id))
const STATUSES = new Set<string>(LIST_STATUSES.map((status) => status.id))
const PRESETS = new Set<string>(['week', 'month', 'year', 'custom'])
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function parseReferralsParams(raw: RawParams, today: string): ReferralsReportQuery {
    const tabValue = first(raw.tab)
    const tab: ReferralsTab = tabValue && TABS.has(tabValue) ? (tabValue as ReferralsTab) : 'overview'

    const presetValue = first(raw.preset)
    let preset: Preset = presetValue && PRESETS.has(presetValue) ? (presetValue as Preset) : 'year'
    const from = first(raw.from)
    const to = first(raw.to)
    let range: DateRange
    if (preset === 'custom' && isIsoDate(from) && isIsoDate(to) && from <= to) {
        range = { from, to }
    } else {
        preset = preset === 'custom' ? 'year' : preset
        range = rangeForPreset(preset, today)
    }

    const statusValue = first(raw.status)
    const status: ListStatus = tab === 'list' && statusValue && STATUSES.has(statusValue) ? (statusValue as ListStatus) : 'all'

    const compare = parseComparison(raw[COMPARISON_PARAM])
    return { tab, preset, range, compare, previous: comparisonRange(range, compare), bucket: chooseBucket(range), status, today }
}

export function referralsSearchParams(q: ReferralsReportQuery): URLSearchParams {
    const params = periodSearchParams(q)
    if (q.tab === 'list' && q.status !== 'all') params.set('status', q.status)
    // Carried on every tab so it survives a tab switch; the default stays out
    // of the URL so existing links keep their shape.
    if (q.compare !== DEFAULT_COMPARISON) params.set(COMPARISON_PARAM, q.compare)
    return params
}

export function referralsExportFilename(q: ReferralsReportQuery): string {
    return `referrals-${q.tab}-${q.range.from}-${q.range.to}.csv`
}

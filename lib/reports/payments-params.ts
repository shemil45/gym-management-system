import {
    chooseBucket, isIsoDate, rangeForPreset,
    type Bucket, type DateRange, type Preset,
} from '@/lib/reports/dates'
import { COMPARISON_PARAM, DEFAULT_COMPARISON, comparisonRange, parseComparison, type Comparison } from '@/lib/reports/comparison'

export type PaymentsTab = 'daybook' | 'summary' | 'plans' | 'pending' | 'staff'

export const PAYMENTS_TABS: { id: PaymentsTab; label: string }[] = [
    { id: 'daybook', label: 'Day book' },
    { id: 'summary', label: 'Summary' },
    { id: 'plans', label: 'By plan' },
    { id: 'pending', label: 'Pending' },
    { id: 'staff', label: 'By staff' },
]

export type RawParams = Record<string, string | string[] | undefined>

export type PaymentsReportQuery = {
    tab: PaymentsTab
    date: string
    preset: Preset
    range: DateRange
    /** What the period is compared against. Ranges come from `comparisonRange`. */
    compare: Comparison
    /** The comparison window, or null when `compare` is `none`. */
    previous: DateRange | null
    bucket: Bucket
}

const TABS = new Set<string>(PAYMENTS_TABS.map((tab) => tab.id))
const PRESETS = new Set<string>(['week', 'month', 'year', 'custom'])

function first(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value
}

export function parsePaymentsParams(raw: RawParams, today: string): PaymentsReportQuery {
    const tabValue = first(raw.tab)
    const tab: PaymentsTab = tabValue && TABS.has(tabValue) ? (tabValue as PaymentsTab) : 'daybook'

    const dateValue = first(raw.date)
    const date = isIsoDate(dateValue) ? dateValue : today

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

    const compare = parseComparison(raw[COMPARISON_PARAM])
    return { tab, date, preset, range, compare, previous: comparisonRange(range, compare), bucket: chooseBucket(range) }
}

export function toSearchParams(query: PaymentsReportQuery): URLSearchParams {
    const params = new URLSearchParams({ tab: query.tab })
    if (query.tab === 'daybook') {
        params.set('date', query.date)
    } else {
        params.set('preset', query.preset)
        if (query.preset === 'custom') {
            params.set('from', query.range.from)
            params.set('to', query.range.to)
        }
    }
    // Carried on every tab, the day book included, so a comparison chosen on
    // Summary is still there after a detour through the day book. The default
    // stays out of the URL to keep existing links and tests unchanged.
    if (query.compare !== DEFAULT_COMPARISON) params.set(COMPARISON_PARAM, query.compare)
    return params
}

export function exportFilename(query: PaymentsReportQuery): string {
    if (query.tab === 'daybook') return `payments-daybook-${query.date}.csv`
    return `payments-${query.tab}-${query.range.from}-${query.range.to}.csv`
}

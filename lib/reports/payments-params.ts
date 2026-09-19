import {
    chooseBucket, isIsoDate, previousRange, rangeForPreset,
    type Bucket, type DateRange, type Preset,
} from '@/lib/reports/dates'

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
    previous: DateRange
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

    return { tab, date, preset, range, previous: previousRange(range), bucket: chooseBucket(range) }
}

export function toSearchParams(query: PaymentsReportQuery): URLSearchParams {
    const params = new URLSearchParams({ tab: query.tab })
    if (query.tab === 'daybook') {
        params.set('date', query.date)
        return params
    }
    params.set('preset', query.preset)
    if (query.preset === 'custom') {
        params.set('from', query.range.from)
        params.set('to', query.range.to)
    }
    return params
}

export function exportFilename(query: PaymentsReportQuery): string {
    if (query.tab === 'daybook') return `payments-daybook-${query.date}.csv`
    return `payments-${query.tab}-${query.range.from}-${query.range.to}.csv`
}

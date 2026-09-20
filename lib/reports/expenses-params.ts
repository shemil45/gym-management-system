import { chooseBucket, isIsoDate, rangeForPreset, type Bucket, type DateRange, type Preset } from '@/lib/reports/dates'
import { COMPARISON_PARAM, DEFAULT_COMPARISON, comparisonRange, parseComparison, type Comparison } from '@/lib/reports/comparison'
import { periodSearchParams } from '@/lib/reports/period-params'
import type { RawParams } from '@/lib/reports/payments-params'

export type { RawParams }

export type ExpensesTab = 'pnl' | 'categories' | 'ledger'

export const EXPENSES_TABS: { id: ExpensesTab; label: string }[] = [
    { id: 'pnl', label: 'P&L statement' },
    { id: 'categories', label: 'By category' },
    { id: 'ledger', label: 'Ledger' },
]

export type ExpensesReportQuery = {
    tab: ExpensesTab
    preset: Preset
    range: DateRange
    /** What the period is compared against. Ranges come from `comparisonRange`. */
    compare: Comparison
    /** The comparison window, or null when `compare` is `none`. */
    previous: DateRange | null
    bucket: Bucket
}

const TABS = new Set<string>(EXPENSES_TABS.map((tab) => tab.id))
const PRESETS = new Set<string>(['week', 'month', 'year', 'custom'])
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function parseExpensesParams(raw: RawParams, today: string): ExpensesReportQuery {
    const tabValue = first(raw.tab)
    const tab: ExpensesTab = tabValue && TABS.has(tabValue) ? (tabValue as ExpensesTab) : 'pnl'
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
    const compare = parseComparison(raw[COMPARISON_PARAM])
    return { tab, preset, range, compare, previous: comparisonRange(range, compare), bucket: chooseBucket(range) }
}

/**
 * The shared period params plus the comparison, which is carried on every
 * tab so it survives a tab switch. The default stays out of the URL so
 * existing links keep their shape.
 */
export function expensesSearchParams(query: ExpensesReportQuery): URLSearchParams {
    const params = periodSearchParams(query)
    if (query.compare !== DEFAULT_COMPARISON) params.set(COMPARISON_PARAM, query.compare)
    return params
}

export function expensesExportFilename(query: ExpensesReportQuery): string {
    return `expenses-${query.tab}-${query.range.from}-${query.range.to}.csv`
}

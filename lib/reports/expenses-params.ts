import { chooseBucket, isIsoDate, previousRange, rangeForPreset, type Bucket, type DateRange, type Preset } from '@/lib/reports/dates'
import type { RawParams } from '@/lib/reports/payments-params'

export type { RawParams }

export type ExpensesTab = 'pnl' | 'categories' | 'ledger'

export const EXPENSES_TABS: { id: ExpensesTab; label: string }[] = [
    { id: 'pnl', label: 'P&L statement' },
    { id: 'categories', label: 'By category' },
    { id: 'ledger', label: 'Ledger' },
]

export type ExpensesReportQuery = { tab: ExpensesTab; preset: Preset; range: DateRange; previous: DateRange; bucket: Bucket }

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
    return { tab, preset, range, previous: previousRange(range), bucket: chooseBucket(range) }
}

export function expensesExportFilename(query: ExpensesReportQuery): string {
    return `expenses-${query.tab}-${query.range.from}-${query.range.to}.csv`
}

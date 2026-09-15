import type { DateRange, Preset } from '@/lib/reports/dates'

/** The part of a report query every period-driven tab shares. */
export type PeriodQuery = { tab: string; preset: Preset; range: DateRange }

export function periodSearchParams(query: PeriodQuery): URLSearchParams {
    const params = new URLSearchParams({ tab: query.tab, preset: query.preset })
    if (query.preset === 'custom') {
        params.set('from', query.range.from)
        params.set('to', query.range.to)
    }
    return params
}

import { previousRange, sameRangeLastYear, type DateRange } from '@/lib/reports/dates'

/**
 * Which period a report compares against. `previous` is the equal-length
 * window immediately before the selected range — the basis every existing
 * delta already uses, so the default keeps current behaviour unchanged.
 *
 * `last-year` is only offered where the gym actually has records that far
 * back; the caller decides that from data it has already fetched (see
 * `lastYearIsAvailable`), because this module must not issue queries.
 */
export type Comparison = 'none' | 'previous' | 'last-year'

export const COMPARISONS: { id: Comparison; label: string }[] = [
    { id: 'previous', label: 'Previous period' },
    { id: 'last-year', label: 'Last year' },
    { id: 'none', label: 'No comparison' },
]

export const DEFAULT_COMPARISON: Comparison = 'previous'

const VALUES = new Set<string>(COMPARISONS.map((option) => option.id))

/** URL key. Absent or unrecognised falls back to the existing behaviour. */
export const COMPARISON_PARAM = 'compare'

export function parseComparison(raw: string | string[] | undefined): Comparison {
    const value = Array.isArray(raw) ? raw[0] : raw
    return value && VALUES.has(value) ? (value as Comparison) : DEFAULT_COMPARISON
}

/** The range to aggregate as the comparison series, or null for no comparison. */
export function comparisonRange(range: DateRange, comparison: Comparison): DateRange | null {
    switch (comparison) {
        case 'none': return null
        case 'previous': return previousRange(range)
        case 'last-year': return sameRangeLastYear(range)
    }
}

/**
 * Whether "last year" is worth offering: the gym has at least one record on or
 * before the start of the same range a year ago. `earliestRecord` comes from
 * data the report already holds — pass null when nothing is known, and the
 * option stays hidden rather than showing an empty comparison.
 */
export function lastYearIsAvailable(range: DateRange, earliestRecord: string | null): boolean {
    if (!earliestRecord) return false
    return earliestRecord <= sameRangeLastYear(range).to
}

/** Short label for a delta suffix, e.g. `vs prev` / `vs last year`. */
export function comparisonSuffix(comparison: Comparison): string {
    switch (comparison) {
        case 'none': return ''
        case 'previous': return 'vs prev'
        case 'last-year': return 'vs last year'
    }
}

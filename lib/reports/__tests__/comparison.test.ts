import { describe, it, expect } from 'vitest'
import { comparisonRange, lastYearIsAvailable, parseComparison } from '@/lib/reports/comparison'
import { sameRangeLastYear } from '@/lib/reports/dates'

describe('parseComparison', () => {
    it('defaults to the previous period', () => {
        expect(parseComparison(undefined)).toBe('previous')
        expect(parseComparison('nonsense')).toBe('previous')
        expect(parseComparison(['last-year'])).toBe('last-year')
        expect(parseComparison('none')).toBe('none')
    })
})

describe('comparisonRange', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' }

    it('reuses the existing date utilities', () => {
        expect(comparisonRange(range, 'previous')).toEqual({ from: '2026-08-02', to: '2026-08-31' })
        expect(comparisonRange(range, 'last-year')).toEqual({ from: '2025-09-01', to: '2025-09-30' })
        expect(comparisonRange(range, 'none')).toBeNull()
    })
})

describe('sameRangeLastYear', () => {
    it('lands 29 Feb on 28 Feb', () => {
        expect(sameRangeLastYear({ from: '2024-02-29', to: '2024-02-29' })).toEqual({ from: '2023-02-28', to: '2023-02-28' })
    })
})

describe('lastYearIsAvailable', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' }

    it('needs a record on or before the end of last year’s window', () => {
        expect(lastYearIsAvailable(range, '2025-09-30')).toBe(true)
        expect(lastYearIsAvailable(range, '2025-10-01')).toBe(false)
        expect(lastYearIsAvailable(range, null)).toBe(false)
    })
})

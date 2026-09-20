import { describe, it, expect } from 'vitest'
import { formatAxisValue, formatShare, formatValue } from '@/lib/reports/chart-format'

describe('formatValue', () => {
    it('formats each kind', () => {
        expect(formatValue(1250, 'currency')).toBe('₹1,250')
        expect(formatValue(1250, 'number')).toBe('1,250')
        expect(formatValue(12.35, 'percent')).toBe('12.4%')
    })

    it('renders a dash for missing or non-finite values', () => {
        expect(formatValue(null)).toBe('—')
        expect(formatValue(undefined)).toBe('—')
        expect(formatValue(Number.NaN)).toBe('—')
        expect(formatValue(Number.POSITIVE_INFINITY)).toBe('—')
    })

    it('keeps one decimal for fractional counts', () => {
        expect(formatValue(3.25, 'number')).toBe('3.3')
    })
})

describe('formatAxisValue', () => {
    it('uses the lakh/crore scale', () => {
        expect(formatAxisValue(950, 'currency')).toBe('₹950')
        expect(formatAxisValue(12_500, 'currency')).toBe('₹12.5k')
        expect(formatAxisValue(250_000, 'currency')).toBe('₹2.5L')
        expect(formatAxisValue(15_000_000, 'currency')).toBe('₹1.5Cr')
    })

    it('drops the currency prefix for counts and keeps the sign', () => {
        expect(formatAxisValue(12_500, 'number')).toBe('12.5k')
        expect(formatAxisValue(-2_000, 'currency')).toBe('-₹2k')
    })
})

describe('formatShare', () => {
    it('is a dash when the total is zero', () => {
        expect(formatShare(5, 0)).toBe('—')
        expect(formatShare(25, 200)).toBe('12.5%')
    })
})

import { describe, it, expect } from 'vitest'
import { changeInsight, countInsight, firstInsight, peakInsight, shareInsight } from '@/lib/reports/insights'

describe('changeInsight', () => {
    it('states the direction and magnitude', () => {
        expect(changeInsight('Revenue', 11_240, 10_000)).toEqual({
            text: 'Revenue increased 12.4% compared with the previous period.',
            tone: 'positive',
        })
        expect(changeInsight('Revenue', 9_000, 10_000)?.tone).toBe('negative')
    })

    it('flips the tone, not the wording, for cost metrics', () => {
        const insight = changeInsight('Expenses', 12_000, 10_000, { invert: true })
        expect(insight?.text).toContain('increased 20.0%')
        expect(insight?.tone).toBe('negative')
    })

    it('has nothing to say without a comparison basis', () => {
        expect(changeInsight('Revenue', 5_000, 0)).toBeNull()
    })

    it('reports an unchanged metric neutrally', () => {
        expect(changeInsight('Revenue', 10_000, 10_000)).toEqual({
            text: 'Revenue was unchanged compared with the previous period.',
            tone: 'neutral',
        })
    })

    it('takes a custom basis label', () => {
        expect(changeInsight('Visits', 120, 100, { basis: 'the same period last year' })?.text)
            .toBe('Visits increased 20.0% compared with the same period last year.')
    })
})

describe('peakInsight', () => {
    it('names the leader', () => {
        expect(peakInsight('attendance', { label: 'Saturday', value: 312 }, 'check-ins')?.text)
            .toBe('Saturday had the highest attendance in this period — 312 check-ins.')
    })

    it('stays silent with no peak', () => {
        expect(peakInsight('attendance', null, 'check-ins')).toBeNull()
        expect(peakInsight('attendance', { label: 'Monday', value: 0 }, 'check-ins')).toBeNull()
    })
})

describe('countInsight', () => {
    it('pluralises and stays silent at zero', () => {
        expect(countInsight(3, 'payment attempt failed', 'payment attempts failed')?.text).toBe('3 payment attempts failed.')
        expect(countInsight(1, 'payment attempt failed', 'payment attempts failed')?.text).toBe('1 payment attempt failed.')
        expect(countInsight(0, 'payment attempt failed', 'payment attempts failed')).toBeNull()
    })
})

describe('shareInsight', () => {
    it('states the leader’s share', () => {
        expect(shareInsight({ label: 'Cash', value: 6_210 }, 10_000, 'collections')?.text)
            .toBe('Cash accounted for 62.1% of collections.')
        expect(shareInsight({ label: 'Cash', value: 100 }, 0, 'collections')).toBeNull()
    })
})

describe('firstInsight', () => {
    it('picks the first available sentence', () => {
        expect(firstInsight(null, countInsight(0, 'a', 'b'), countInsight(2, 'thing', 'things'))?.text).toBe('2 things.')
        expect(firstInsight(null, null)).toBeNull()
    })
})

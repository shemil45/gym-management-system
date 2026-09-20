import { describe, it, expect } from 'vitest'
import { parsePaymentsParams, toSearchParams, exportFilename } from '@/lib/reports/payments-params'

const today = '2026-09-15'

describe('parsePaymentsParams', () => {
    it('defaults to day book today and this month', () => {
        const q = parsePaymentsParams({}, today)
        expect(q.tab).toBe('daybook')
        expect(q.date).toBe(today)
        expect(q.preset).toBe('month')
        expect(q.range).toEqual({ from: '2026-09-01', to: today })
        expect(q.previous).toEqual({ from: '2026-08-17', to: '2026-08-31' })
        expect(q.bucket).toBe('day')
    })
    it('ignores junk', () => {
        const q = parsePaymentsParams({ tab: 'nope', date: '2026-13-01', preset: 'decade' }, today)
        expect(q.tab).toBe('daybook')
        expect(q.date).toBe(today)
        expect(q.preset).toBe('month')
    })
    it('custom range needs both ends in order, else falls back to month', () => {
        expect(parsePaymentsParams({ preset: 'custom', from: '2026-03-01', to: '2026-09-15' }, today).bucket).toBe('month')
        expect(parsePaymentsParams({ preset: 'custom', from: '2026-09-15', to: '2026-09-01' }, today).preset).toBe('month')
        expect(parsePaymentsParams({ preset: 'custom', from: '2026-09-01' }, today).preset).toBe('month')
    })
    it('takes the first value of an array param', () => {
        expect(parsePaymentsParams({ tab: ['staff', 'plans'] }, today).tab).toBe('staff')
    })
    it('defaults the comparison to the previous period and reads compare=', () => {
        expect(parsePaymentsParams({}, today).compare).toBe('previous')
        const none = parsePaymentsParams({ tab: 'summary', compare: 'none' }, today)
        expect(none.compare).toBe('none')
        expect(none.previous).toBeNull()
        expect(parsePaymentsParams({ compare: 'bogus' }, today).compare).toBe('previous')
    })
})

describe('toSearchParams / exportFilename', () => {
    it('round-trips a day book query', () => {
        const q = parsePaymentsParams({ tab: 'daybook', date: '2026-09-10' }, today)
        expect(toSearchParams(q).toString()).toBe('tab=daybook&date=2026-09-10')
        expect(exportFilename(q)).toBe('payments-daybook-2026-09-10.csv')
    })
    it('round-trips a custom summary query', () => {
        const q = parsePaymentsParams({ tab: 'summary', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(toSearchParams(q).toString()).toBe('tab=summary&preset=custom&from=2026-09-01&to=2026-09-15')
        expect(exportFilename(q)).toBe('payments-summary-2026-09-01-2026-09-15.csv')
    })
    it('presets keep only the preset', () => {
        const q = parsePaymentsParams({ tab: 'plans', preset: 'week' }, today)
        expect(toSearchParams(q).toString()).toBe('tab=plans&preset=week')
    })
    it('carries a non-default comparison on every tab, the day book included', () => {
        const summary = parsePaymentsParams({ tab: 'summary', compare: 'none' }, today)
        expect(toSearchParams(summary).toString()).toBe('tab=summary&preset=month&compare=none')
        const daybook = parsePaymentsParams({ tab: 'daybook', compare: 'none' }, today)
        expect(toSearchParams(daybook).toString()).toBe(`tab=daybook&date=${today}&compare=none`)
        // Switching tab through toSearchParams keeps it.
        expect(toSearchParams({ ...summary, tab: 'staff' }).toString()).toBe('tab=staff&preset=month&compare=none')
    })
})

import { describe, it, expect } from 'vitest'
import { parseExpensesParams, expensesExportFilename, expensesSearchParams } from '@/lib/reports/expenses-params'
import { periodSearchParams } from '@/lib/reports/period-params'

const today = '2026-09-15'

describe('parseExpensesParams', () => {
    it('defaults to pnl and this year', () => {
        const q = parseExpensesParams({}, today)
        expect(q.tab).toBe('pnl')
        expect(q.preset).toBe('year')
        expect(q.range).toEqual({ from: '2026-01-01', to: today })
        expect(q.bucket).toBe('month')
        expect(q.previous?.to).toBe('2025-12-31')
    })
    it('falls back on junk and bad custom ranges', () => {
        expect(parseExpensesParams({ tab: 'x', preset: 'decade' }, today)).toMatchObject({ tab: 'pnl', preset: 'year' })
        expect(parseExpensesParams({ preset: 'custom', from: '2026-09-10', to: '2026-09-01' }, today).preset).toBe('year')
    })
    it('accepts a custom range and round-trips it', () => {
        const q = parseExpensesParams({ tab: 'ledger', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(q.bucket).toBe('day')
        expect(periodSearchParams(q).toString()).toBe('tab=ledger&preset=custom&from=2026-09-01&to=2026-09-15')
        expect(expensesExportFilename(q)).toBe('expenses-ledger-2026-09-01-2026-09-15.csv')
    })
    it('defaults the comparison to the previous period and carries a non-default one on every tab', () => {
        expect(parseExpensesParams({}, today).compare).toBe('previous')
        const none = parseExpensesParams({ tab: 'pnl', compare: 'none' }, today)
        expect(none.previous).toBeNull()
        expect(expensesSearchParams(none).toString()).toBe('tab=pnl&preset=year&compare=none')
        expect(expensesSearchParams({ ...none, tab: 'ledger' }).toString()).toBe('tab=ledger&preset=year&compare=none')
        // The default stays out of the URL.
        expect(expensesSearchParams(parseExpensesParams({}, today)).toString()).toBe('tab=pnl&preset=year')
    })
})

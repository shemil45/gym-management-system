import { describe, it, expect } from 'vitest'
import { periodSearchParams } from '@/lib/reports/period-params'

describe('periodSearchParams', () => {
    it('emits tab and preset for presets', () => {
        expect(periodSearchParams({ tab: 'pnl', preset: 'year', range: { from: '2026-01-01', to: '2026-09-15' } }).toString())
            .toBe('tab=pnl&preset=year')
    })
    it('adds from/to for custom', () => {
        expect(periodSearchParams({ tab: 'ledger', preset: 'custom', range: { from: '2026-03-01', to: '2026-03-31' } }).toString())
            .toBe('tab=ledger&preset=custom&from=2026-03-01&to=2026-03-31')
    })
})

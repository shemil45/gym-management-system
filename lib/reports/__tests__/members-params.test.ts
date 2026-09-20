import { describe, it, expect } from 'vitest'
import { parseMembersParams, membersSearchParams, membersExportFilename } from '@/lib/reports/members-params'

const today = '2026-09-16'

describe('parseMembersParams', () => {
    it('defaults', () => {
        const q = parseMembersParams({}, today)
        expect(q).toMatchObject({ tab: 'joins', preset: 'month', horizon: 30, lapsed: false, days: 14, today })
        expect(q.range).toEqual({ from: '2026-09-01', to: today })
    })
    it('parses horizon, lapsed, days and rejects junk', () => {
        expect(parseMembersParams({ tab: 'renewals', horizon: '15', lapsed: '1' }, today)).toMatchObject({ tab: 'renewals', horizon: 15, lapsed: true })
        expect(parseMembersParams({ tab: 'inactive', days: '30' }, today)).toMatchObject({ days: 30 })
        expect(parseMembersParams({ tab: 'nope', horizon: '9', days: '2', lapsed: 'yes' }, today)).toMatchObject({ tab: 'joins', horizon: 30, days: 14, lapsed: false })
    })
})

describe('membersSearchParams / filename', () => {
    it('joins keeps period only', () => {
        const q = parseMembersParams({ tab: 'joins', preset: 'year' }, today)
        expect(membersSearchParams(q).toString()).toBe('tab=joins&preset=year')
        expect(membersExportFilename(q)).toBe('members-joins-2026-01-01-2026-09-16.csv')
    })
    it('renewals upcoming vs lapsed', () => {
        const up = parseMembersParams({ tab: 'renewals', horizon: '7' }, today)
        expect(membersSearchParams(up).toString()).toBe('tab=renewals&horizon=7')
        expect(membersExportFilename(up)).toBe('members-renewals-next7d-2026-09-16.csv')
        const lapsed = parseMembersParams({ tab: 'renewals', lapsed: '1', preset: 'custom', from: '2026-08-01', to: '2026-08-31' }, today)
        expect(membersSearchParams(lapsed).toString()).toBe('tab=renewals&horizon=30&lapsed=1&preset=custom&from=2026-08-01&to=2026-08-31')
        expect(membersExportFilename(lapsed)).toBe('members-renewals-lapsed-2026-08-01-2026-08-31.csv')
    })
    it('roster and inactive', () => {
        expect(membersSearchParams(parseMembersParams({ tab: 'roster' }, today)).toString()).toBe('tab=roster')
        expect(membersExportFilename(parseMembersParams({ tab: 'roster' }, today))).toBe('members-roster-2026-09-16.csv')
        const inactive = parseMembersParams({ tab: 'inactive', days: '7' }, today)
        expect(membersSearchParams(inactive).toString()).toBe('tab=inactive&days=7')
        expect(membersExportFilename(inactive)).toBe('members-inactive-7d-2026-09-16.csv')
    })
    it('carries a non-default comparison on every tab and keeps the default out of the URL', () => {
        expect(parseMembersParams({}, today).compare).toBe('previous')
        const none = parseMembersParams({ tab: 'joins', compare: 'none' }, today)
        expect(none.previous).toBeNull()
        expect(membersSearchParams(none).toString()).toBe('tab=joins&preset=month&compare=none')
        expect(membersSearchParams({ ...none, tab: 'roster' }).toString()).toBe('tab=roster&compare=none')
        expect(membersSearchParams({ ...none, tab: 'inactive' }).toString()).toBe('tab=inactive&days=14&compare=none')
    })
})

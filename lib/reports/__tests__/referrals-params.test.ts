import { describe, it, expect } from 'vitest'
import { parseReferralsParams, referralsSearchParams, referralsExportFilename } from '@/lib/reports/referrals-params'

const today = '2026-09-16'

describe('parseReferralsParams', () => {
    it('defaults to overview, this year, status all', () => {
        const q = parseReferralsParams({}, today)
        expect(q.tab).toBe('overview')
        expect(q.preset).toBe('year')
        expect(q.range).toEqual({ from: '2026-01-01', to: today })
        expect(q.status).toBe('all')
        expect(q.today).toBe(today)
    })

    it('falls back on junk tab, preset, and status', () => {
        const q = parseReferralsParams({ tab: 'bogus', preset: 'decade', status: 'bogus' }, today)
        expect(q.tab).toBe('overview')
        expect(q.preset).toBe('year')
        expect(q.status).toBe('all')
    })

    it('falls back on an invalid custom range', () => {
        const q = parseReferralsParams({ preset: 'custom', from: '2026-09-10', to: '2026-09-01' }, today)
        expect(q.preset).toBe('year')
    })

    it('parses status only when tab is list; ignored on other tabs', () => {
        const list = parseReferralsParams({ tab: 'list', status: 'pending' }, today)
        expect(list.tab).toBe('list')
        expect(list.status).toBe('pending')

        const overview = parseReferralsParams({ tab: 'overview', status: 'pending' }, today)
        expect(overview.tab).toBe('overview')
        expect(overview.status).toBe('all')

        const leaderboard = parseReferralsParams({ tab: 'leaderboard', status: 'expired' }, today)
        expect(leaderboard.status).toBe('all')
    })

    it('accepts a custom range and carries bucket/previous through', () => {
        const q = parseReferralsParams({ tab: 'list', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(q.bucket).toBe('day')
        expect(q.range).toEqual({ from: '2026-09-01', to: '2026-09-15' })
        expect(q.previous).toEqual({ from: '2026-08-17', to: '2026-08-31' })
    })
})

describe('referralsSearchParams', () => {
    it('emits tab + period for overview, without status', () => {
        const q = parseReferralsParams({ tab: 'overview', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(referralsSearchParams(q).toString()).toBe('tab=overview&preset=custom&from=2026-09-01&to=2026-09-15')
    })

    it('emits tab + period for leaderboard, without status', () => {
        const q = parseReferralsParams({ tab: 'leaderboard' }, today)
        expect(referralsSearchParams(q).toString()).toBe('tab=leaderboard&preset=year')
    })

    it('emits status on list only when not all', () => {
        const all = parseReferralsParams({ tab: 'list' }, today)
        expect(referralsSearchParams(all).toString()).toBe('tab=list&preset=year')

        const pending = parseReferralsParams({ tab: 'list', status: 'pending' }, today)
        const params = referralsSearchParams(pending)
        expect(params.get('status')).toBe('pending')
        expect(params.toString()).toBe('tab=list&preset=year&status=pending')
    })
})

describe('referralsExportFilename', () => {
    it('builds referrals-<tab>-<from>-<to>.csv', () => {
        const q = parseReferralsParams({ tab: 'list', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(referralsExportFilename(q)).toBe('referrals-list-2026-09-01-2026-09-15.csv')
    })
})

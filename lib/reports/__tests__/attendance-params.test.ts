import { describe, it, expect } from 'vitest'
import { parseAttendanceParams, attendanceSearchParams, attendanceExportFilename } from '@/lib/reports/attendance-params'

const today = '2026-09-16'

describe('parseAttendanceParams', () => {
    it('defaults to footfall, this month, sort most', () => {
        const q = parseAttendanceParams({}, today)
        expect(q.tab).toBe('footfall')
        expect(q.preset).toBe('month')
        expect(q.range).toEqual({ from: '2026-09-01', to: today })
        expect(q.sort).toBe('most')
        expect(q.today).toBe(today)
    })

    it('falls back on junk tab, preset, and sort', () => {
        const q = parseAttendanceParams({ tab: 'bogus', preset: 'decade', sort: 'bogus' }, today)
        expect(q.tab).toBe('footfall')
        expect(q.preset).toBe('month')
        expect(q.sort).toBe('most')
    })

    it('falls back on an invalid custom range', () => {
        const q = parseAttendanceParams({ preset: 'custom', from: '2026-09-10', to: '2026-09-01' }, today)
        expect(q.preset).toBe('month')
    })

    it('parses sort only when tab is members; ignored on other tabs', () => {
        const members = parseAttendanceParams({ tab: 'members', sort: 'gap' }, today)
        expect(members.tab).toBe('members')
        expect(members.sort).toBe('gap')

        const footfall = parseAttendanceParams({ tab: 'footfall', sort: 'gap' }, today)
        expect(footfall.tab).toBe('footfall')
        expect(footfall.sort).toBe('most')

        const heatmap = parseAttendanceParams({ tab: 'heatmap', sort: 'least' }, today)
        expect(heatmap.sort).toBe('most')
    })

    it('accepts a custom range and carries bucket/previous through', () => {
        const q = parseAttendanceParams({ tab: 'heatmap', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(q.bucket).toBe('day')
        expect(q.range).toEqual({ from: '2026-09-01', to: '2026-09-15' })
        expect(q.previous).toEqual({ from: '2026-08-17', to: '2026-08-31' })
    })
})

describe('attendanceSearchParams', () => {
    it('emits tab + period for footfall, without sort', () => {
        const q = parseAttendanceParams({ tab: 'footfall', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(attendanceSearchParams(q).toString()).toBe('tab=footfall&preset=custom&from=2026-09-01&to=2026-09-15')
    })

    it('emits tab + period for heatmap, without sort', () => {
        const q = parseAttendanceParams({ tab: 'heatmap' }, today)
        expect(attendanceSearchParams(q).toString()).toBe('tab=heatmap&preset=month')
    })

    it('emits sort only on members', () => {
        const q = parseAttendanceParams({ tab: 'members', sort: 'least' }, today)
        const params = attendanceSearchParams(q)
        expect(params.get('sort')).toBe('least')
        expect(params.toString()).toBe('tab=members&preset=month&sort=least')
    })
})

describe('attendanceExportFilename', () => {
    it('builds attendance-<tab>-<from>-<to>.csv', () => {
        const q = parseAttendanceParams({ tab: 'members', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(attendanceExportFilename(q)).toBe('attendance-members-2026-09-01-2026-09-15.csv')
    })
    it('carries a non-default comparison on every tab and keeps the default out of the URL', () => {
        expect(parseAttendanceParams({}, today).compare).toBe('previous')
        const none = parseAttendanceParams({ tab: 'footfall', compare: 'none' }, today)
        expect(none.previous).toBeNull()
        expect(attendanceSearchParams(none).toString()).toBe('tab=footfall&preset=month&compare=none')
        expect(attendanceSearchParams({ ...none, tab: 'members' }).toString()).toBe('tab=members&preset=month&sort=most&compare=none')
    })
})

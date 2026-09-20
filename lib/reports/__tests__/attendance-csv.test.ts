import { describe, it, expect } from 'vitest'
import { footfallCsv, byMemberCsv, heatmapCsv } from '@/lib/reports/attendance-csv'
import type { ReportMemberRow } from '@/lib/reports/members-aggregate'

function member(o: Partial<ReportMemberRow> = {}): ReportMemberRow {
    return {
        id: 'm1', member_code: 'GYM001', full_name: 'Asha', phone: '9999999999', status: 'active',
        plan_id: 'p1', plan_name: 'Monthly', plan_price: 1000, plan_duration_days: 30,
        membership_start_date: '2026-09-01', membership_expiry_date: '2026-09-30',
        referred_by: null, referrer_name: null, referral_coins_balance: 0, created_at: '2026-09-01T04:00:00Z', is_demo: false,
        ...o,
    }
}

describe('footfallCsv', () => {
    it('has the header and one row per bucket', () => {
        const report: Parameters<typeof footfallCsv>[0] = {
            buckets: [{
                start: '2026-09-01', label: '01 Sep', visits: 10, uniqueMembers: 4, days: 1, perDay: 10,
                peakHour: 18, byMethod: { manual: 2, qr: 5, kiosk: 2, fingerprint: 1 }, avgMinutes: 42.345,
            }],
        }
        const lines = footfallCsv(report).split('\r\n')
        expect(lines[0]).toBe('﻿Bucket start,Period,Visits,Unique members,Days,Per day,Peak hour,Manual,QR,Kiosk,Fingerprint,Avg minutes')
        expect(lines[1]).toBe('2026-09-01,01 Sep,10,4,1,10,18,2,5,2,1,42.35')
        expect(lines).toHaveLength(2)
    })

    it('renders null peak hour and avg minutes as blank cells', () => {
        const report: Parameters<typeof footfallCsv>[0] = {
            buckets: [{
                start: '2026-09-01', label: '01 Sep', visits: 0, uniqueMembers: 0, days: 1, perDay: 0,
                peakHour: null, byMethod: { manual: 0, qr: 0, kiosk: 0, fingerprint: 0 }, avgMinutes: null,
            }],
        }
        const lines = footfallCsv(report).split('\r\n')
        expect(lines[1]).toBe('2026-09-01,01 Sep,0,0,1,0,,0,0,0,0,')
    })
})

describe('byMemberCsv', () => {
    it('has the header and one row per member', () => {
        const report: Parameters<typeof byMemberCsv>[0] = {
            rows: [{ member: member(), visits: 12, avgMinutes: 55.5, lastVisit: '2026-09-15', daysSince: 1 }],
        }
        const lines = byMemberCsv(report).split('\r\n')
        expect(lines[0]).toBe('﻿Member,Member ID,Phone,Plan,Visits,Avg minutes,Last visit,Days since')
        expect(lines[1]).toBe('Asha,GYM001,9999999999,Monthly,12,55.5,2026-09-15,1')
        expect(lines).toHaveLength(2)
    })

    it('renders null avg minutes / last visit / days since as blank cells', () => {
        const report: Parameters<typeof byMemberCsv>[0] = {
            rows: [{ member: member(), visits: 0, avgMinutes: null, lastVisit: null, daysSince: null }],
        }
        const lines = byMemberCsv(report).split('\r\n')
        expect(lines[1]).toBe('Asha,GYM001,9999999999,Monthly,0,,,')
    })
})

describe('heatmapCsv', () => {
    it('has the header, one row per hour, and a final Total row', () => {
        const report: Parameters<typeof heatmapCsv>[0] = {
            hours: [6, 7],
            cells: [[1, 0, 0, 0, 0, 0, 0], [2, 3, 0, 0, 0, 0, 0]],
            rowTotals: [1, 5],
            colTotals: [3, 3, 0, 0, 0, 0, 0],
        }
        const lines = heatmapCsv(report).split('\r\n')
        expect(lines[0]).toBe('﻿Hour,Mon,Tue,Wed,Thu,Fri,Sat,Sun,Total')
        expect(lines[1]).toBe('06:00,1,0,0,0,0,0,0,1')
        expect(lines[2]).toBe('07:00,2,3,0,0,0,0,0,5')
        expect(lines[3]).toBe('Total,3,3,0,0,0,0,0,6')
        expect(lines).toHaveLength(4)
    })
})

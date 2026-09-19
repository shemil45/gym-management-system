import { describe, it, expect } from 'vitest'
import { overviewCsv, leaderboardCsv, listCsv } from '@/lib/reports/referrals-csv'
import type { OverviewReport, LeaderboardReport, ListReport } from '@/lib/reports/referrals'
import type { ReportMemberRow } from '@/lib/reports/members-aggregate'

function member(o: Partial<ReportMemberRow> = {}): ReportMemberRow {
    return {
        id: 'm1',
        member_code: 'GYM001',
        full_name: 'Referrer One',
        phone: '9000000000',
        status: 'active',
        plan_id: null,
        plan_name: null,
        plan_price: 0,
        plan_duration_days: 0,
        membership_start_date: null,
        membership_expiry_date: null,
        referred_by: null,
        referrer_name: null,
        referral_coins_balance: 500,
        created_at: '2026-01-01T00:00:00Z',
        is_demo: false,
        ...o,
    }
}

describe('overviewCsv', () => {
    it('emits headers and one row per bucket', () => {
        const report: OverviewReport = {
            buckets: [
                { start: '2026-01-01', label: 'Jan 2026', created: 4, converted: 2, pending: 1, expired: 1, conversion: 50, coinsIssued: 1000, coinsRedeemed: 300 },
            ],
            totals: { created: 4, converted: 2, pending: 1, expired: 1, conversion: 50, coinsIssued: 1000, coinsRedeemed: 300 },
            kpis: { referrals: 4, conversions: 2, coinsIssued: 1000, coinsRedeemed: 300 },
            previous: { referrals: 0, conversions: 0, coinsIssued: 0, coinsRedeemed: 0 },
            outstanding: 500,
        }
        const csv = overviewCsv(report)
        const lines = csv.replace('﻿', '').split('\r\n')
        expect(lines[0]).toBe('Bucket start,Period,Created,Converted,Pending,Expired,Conversion %,Coins issued,Coins redeemed,Value')
        expect(lines[1]).toBe('2026-01-01,Jan 2026,4,2,1,1,50,1000,300,300')
    })

    it('rounds conversion % to 2 dp and handles null', () => {
        const report: OverviewReport = {
            buckets: [
                { start: '2026-01-01', label: 'Jan 2026', created: 3, converted: 1, pending: 1, expired: 1, conversion: 33.33333, coinsIssued: 500, coinsRedeemed: 0 },
                { start: '2026-02-01', label: 'Feb 2026', created: 0, converted: 0, pending: 0, expired: 0, conversion: null, coinsIssued: 0, coinsRedeemed: 0 },
            ],
            totals: { created: 3, converted: 1, pending: 1, expired: 1, conversion: 33.33333, coinsIssued: 500, coinsRedeemed: 0 },
            kpis: { referrals: 3, conversions: 1, coinsIssued: 500, coinsRedeemed: 0 },
            previous: { referrals: 0, conversions: 0, coinsIssued: 0, coinsRedeemed: 0 },
            outstanding: 0,
        }
        const csv = overviewCsv(report)
        const lines = csv.replace('﻿', '').split('\r\n')
        expect(lines[1]).toBe('2026-01-01,Jan 2026,3,1,1,1,33.33,500,0,0')
        expect(lines[2]).toBe('2026-02-01,Feb 2026,0,0,0,0,,0,0,0')
    })
})

describe('leaderboardCsv', () => {
    it('emits rank + row fields', () => {
        const report: LeaderboardReport = {
            rows: [
                { member: member({ full_name: 'Alice', member_code: 'GYM001', phone: '9000000001', referral_coins_balance: 1500 }), referrals: 4, converted: 3, conversion: 75, coinsEarned: 1500, balance: 1500 },
                { member: member({ full_name: 'Bob', member_code: 'GYM002', phone: '9000000002', referral_coins_balance: 0 }), referrals: 2, converted: 0, conversion: null, coinsEarned: 0, balance: 0 },
            ],
        }
        const csv = leaderboardCsv(report)
        const lines = csv.replace('﻿', '').split('\r\n')
        expect(lines[0]).toBe('Rank,Referrer,Referrer ID,Phone,Referrals,Converted,Conversion %,Coins earned,Balance')
        expect(lines[1]).toBe('1,Alice,GYM001,9000000001,4,3,75,1500,1500')
        expect(lines[2]).toBe('2,Bob,GYM002,9000000002,2,0,,0,0')
    })
})

describe('listCsv', () => {
    it('emits referral rows with days to convert', () => {
        const report: ListReport = {
            rows: [
                {
                    id: 'r1', referrer_id: 'm1', referred_id: 'm2', code: 'CODE1', status: 'applied',
                    created_at: '2026-01-10T10:00:00Z', applied_at: '2026-01-15T10:00:00Z',
                    referrer_name: 'Alice', referrer_code: 'GYM001', referrer_phone: '9000000001',
                    referred_name: 'Carol', referred_code: 'GYM003',
                    daysToConvert: 4,
                },
                {
                    id: 'r2', referrer_id: 'm1', referred_id: 'm4', code: null, status: 'pending',
                    created_at: '2026-01-11T10:00:00Z', applied_at: null,
                    referrer_name: 'Alice', referrer_code: 'GYM001', referrer_phone: '9000000001',
                    referred_name: 'Dave', referred_code: 'GYM004',
                    daysToConvert: null,
                },
            ],
            status: 'all',
        }
        const csv = listCsv(report)
        const lines = csv.replace('﻿', '').split('\r\n')
        expect(lines[0]).toBe('Date,Referrer,Referrer ID,Referred,Referred ID,Code,Status,Applied on,Days to convert')
        expect(lines[1]).toBe('2026-01-10,Alice,GYM001,Carol,GYM003,CODE1,applied,2026-01-15,4')
        expect(lines[2]).toBe('2026-01-11,Alice,GYM001,Dave,GYM004,,pending,,')
    })
})

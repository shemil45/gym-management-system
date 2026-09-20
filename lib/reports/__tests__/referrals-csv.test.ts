import { describe, it, expect } from 'vitest'
import { overviewCsv, leaderboardCsv, listCsv } from '@/lib/reports/referrals-csv'
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
        referral_token_created_at: null,
        referral_link_visits: 0,
        created_at: '2026-01-01T00:00:00Z',
        is_demo: false,
        ...o,
    }
}

describe('overviewCsv', () => {
    it('emits headers and one row per bucket', () => {
        const report: Parameters<typeof overviewCsv>[0] = {
            buckets: [
                { start: '2026-01-01', label: 'Jan 2026', created: 4, leads: 3, converted: 2, pending: 1, expired: 1, cancelled: 0, conversion: 50, coinsIssued: 1000, coinsRedeemed: 300 },
            ],
        }
        const csv = overviewCsv(report)
        const lines = csv.replace('﻿', '').split('\r\n')
        expect(lines[0]).toBe('Bucket start,Period,Started,Leads,Converted,Pending,Expired,Cancelled,Conversion %,Coins issued,Coins redeemed,Value')
        expect(lines[1]).toBe('2026-01-01,Jan 2026,4,3,2,1,1,0,50,1000,300,300')
    })

    it('rounds conversion % to 2 dp and handles null', () => {
        const report: Parameters<typeof overviewCsv>[0] = {
            buckets: [
                { start: '2026-01-01', label: 'Jan 2026', created: 3, leads: 1, converted: 1, pending: 1, expired: 1, cancelled: 0, conversion: 33.33333, coinsIssued: 500, coinsRedeemed: 0 },
                { start: '2026-02-01', label: 'Feb 2026', created: 0, leads: 0, converted: 0, pending: 0, expired: 0, cancelled: 0, conversion: null, coinsIssued: 0, coinsRedeemed: 0 },
            ],
        }
        const csv = overviewCsv(report)
        const lines = csv.replace('﻿', '').split('\r\n')
        expect(lines[1]).toBe('2026-01-01,Jan 2026,3,1,1,1,1,0,33.33,500,0,0')
        expect(lines[2]).toBe('2026-02-01,Feb 2026,0,0,0,0,0,0,,0,0,0')
    })
})

describe('leaderboardCsv', () => {
    it('emits rank + row fields', () => {
        const report: Parameters<typeof leaderboardCsv>[0] = {
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
        const report: Parameters<typeof listCsv>[0] = {
            rows: [
                {
                    id: 'r1', referrer_id: 'm1', referred_id: 'm2', code: 'CODE1', status: 'converted', source: 'link',
                    created_at: '2026-01-10T10:00:00Z', applied_at: '2026-01-15T10:00:00Z', expires_at: '2026-01-24T10:00:00Z', cancelled_at: null,
                    referrer_name: 'Alice', referrer_code: 'GYM001', referrer_phone: '9000000001',
                    referred_name: 'Carol', referred_code: 'GYM003',
                    daysToConvert: 4,
                },
                {
                    id: 'r2', referrer_id: 'm1', referred_id: 'm4', code: null, status: 'pending', source: 'staff',
                    created_at: '2026-01-11T10:00:00Z', applied_at: null, expires_at: null, cancelled_at: null,
                    referrer_name: 'Alice', referrer_code: 'GYM001', referrer_phone: '9000000001',
                    referred_name: 'Dave', referred_code: 'GYM004',
                    daysToConvert: null,
                },
            ],
        }
        const csv = listCsv(report)
        const lines = csv.replace('﻿', '').split('\r\n')
        expect(lines[0]).toBe('Date,Referrer,Referrer ID,Referred,Referred ID,Source,Status,Expires,Converted on,Days to convert')
        expect(lines[1]).toBe('2026-01-10,Alice,GYM001,Carol,GYM003,link,converted,2026-01-24,2026-01-15,4')
        expect(lines[2]).toBe('2026-01-11,Alice,GYM001,Dave,GYM004,staff,pending,,,')
    })
})

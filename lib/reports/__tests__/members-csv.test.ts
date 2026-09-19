import { describe, it, expect } from 'vitest'
import { joinsCsv, renewalsCsv, retentionCsv, rosterCsv, inactiveCsv } from '@/lib/reports/members-csv'
import type { ReportMemberRow, PaymentStub } from '@/lib/reports/members-aggregate'
import type { JoinsReport, RenewalsReport, RetentionReport, RosterReport, InactiveReport } from '@/lib/reports/members'

function member(o: Partial<ReportMemberRow> = {}): ReportMemberRow {
    return {
        id: 'm1', member_code: 'GYM001', full_name: 'Asha', phone: '9999999999', status: 'active',
        plan_id: 'p1', plan_name: 'Monthly', plan_price: 1000, plan_duration_days: 30,
        membership_start_date: '2026-09-01', membership_expiry_date: '2026-09-30',
        referred_by: null, referrer_name: null, referral_coins_balance: 0, created_at: '2026-09-01T04:00:00Z', is_demo: false,
        ...o,
    }
}

function stub(o: Partial<PaymentStub> = {}): PaymentStub {
    return {
        member_id: 'm1', amount: 1000, payment_date: '2026-09-01',
        membership_start_date: '2026-09-01', membership_end_date: '2026-09-30', plan_name: 'Monthly',
        ...o,
    }
}

describe('joinsCsv', () => {
    it('has the header and one row per join', () => {
        const report: JoinsReport = {
            rows: [{ member: member({ referrer_name: 'Bob' }), joinDate: '2026-09-15', source: 'referral', firstPayment: stub({ amount: 500, payment_date: '2026-09-16' }) }],
            kpis: { joins: 1, referralShare: 100 },
            previous: { joins: 0, referralShare: 0 },
        }
        const lines = joinsCsv(report).split('\r\n')
        expect(lines[0]).toBe('﻿Join date,Member,Member ID,Phone,Plan,Source,Referrer,First payment,First payment date')
        expect(lines[1]).toBe('2026-09-15,Asha,GYM001,9999999999,Monthly,Referral,Bob,500,2026-09-16')
        expect(lines).toHaveLength(2)
    })
})

describe('renewalsCsv', () => {
    it('upcoming mode', () => {
        const report: RenewalsReport = {
            mode: 'upcoming',
            rows: [{ member: member(), expiry: '2026-09-30', daysLeft: 14, lastPayment: stub({ amount: 1000, payment_date: '2026-09-01' }) }],
            horizon: 30,
        }
        const lines = renewalsCsv(report).split('\r\n')
        expect(lines[0]).toBe('﻿Member,Member ID,Phone,Plan,Expiry,Days left,Last payment,Last payment date')
        expect(lines[1]).toBe('Asha,GYM001,9999999999,Monthly,2026-09-30,14,1000,2026-09-01')
        expect(lines).toHaveLength(2)
    })
    it('lapsed mode', () => {
        const report: RenewalsReport = {
            mode: 'lapsed',
            rows: [{ member: member(), endedOn: '2026-08-31', overdueDays: 5, lastPayment: null }],
        }
        const lines = renewalsCsv(report).split('\r\n')
        expect(lines[0]).toBe('﻿Member,Member ID,Phone,Plan,Ended on,Overdue days,Last payment,Last payment date')
        expect(lines[1]).toBe('Asha,GYM001,9999999999,Monthly,2026-08-31,5,,')
        expect(lines).toHaveLength(2)
    })
})

describe('retentionCsv', () => {
    it('emits buckets then a blank line then the churned list', () => {
        const report: RetentionReport = {
            buckets: [{ start: '2026-09-01', label: 'Sep 2026', ended: 4, renewed: 3, retention: 75, churned: 1 }],
            totals: { ended: 4, renewed: 3, retention: 75, churned: 1 },
            previous: { ended: 2, renewed: 1, retention: 50, churned: 1 },
            churned: [{ member: member(), endedOn: '2026-09-10', overdueDays: 6, lastPayment: stub({ amount: 1000, payment_date: '2026-09-01' }) }],
        }
        const csv = retentionCsv(report)
        const sections = csv.split('\r\n\r\n')
        expect(sections).toHaveLength(2)
        const bucketLines = sections[0].split('\r\n')
        expect(bucketLines[0]).toBe('﻿Bucket start,Period,Ended,Renewed,Retention %,Churned')
        expect(bucketLines[1]).toBe('2026-09-01,Sep 2026,4,3,75,1')
        const churnedLines = sections[1].split('\r\n')
        expect(churnedLines[0]).toBe('Member,Member ID,Phone,Plan,Ended on,Last payment,Last payment date')
        expect(churnedLines[1]).toBe('Asha,GYM001,9999999999,Monthly,2026-09-10,1000,2026-09-01')
    })
})

describe('rosterCsv', () => {
    it('emits status counts then a blank line then the plan table', () => {
        const report: RosterReport = {
            counts: { active: 3, expiring: 1, expired: 2, frozen: 0, inactive: 1, total: 7 },
            plans: [{ plan: 'Monthly', members: 4, share: 100, price: 1000, durationDays: 30, monthlyValue: 1000 }],
            asOf: '2026-09-16',
        }
        const csv = rosterCsv(report)
        const sections = csv.split('\r\n\r\n')
        expect(sections).toHaveLength(2)
        const statusLines = sections[0].split('\r\n')
        expect(statusLines[0]).toBe('﻿Status,Members')
        expect(statusLines).toContain('Active,3')
        expect(statusLines).toContain('Total,7')
        const planLines = sections[1].split('\r\n')
        expect(planLines[0]).toBe('Plan,Members,Share %,Price,Duration days,Monthly value')
        expect(planLines[1]).toBe('Monthly,4,100,1000,30,1000')
    })
})

describe('inactiveCsv', () => {
    it('has the header and one row per member', () => {
        const report: InactiveReport = {
            rows: [{ member: member(), lastVisit: '2026-08-20', daysSince: 27, expiry: '2026-09-30' }],
            days: 14,
        }
        const lines = inactiveCsv(report).split('\r\n')
        expect(lines[0]).toBe('﻿Member,Member ID,Phone,Plan,Expiry,Last visit,Days since')
        expect(lines[1]).toBe('Asha,GYM001,9999999999,Monthly,2026-09-30,2026-08-20,27')
        expect(lines).toHaveLength(2)
    })
    it('no-visit member renders "No visit in Nd" / "N+" instead of blank cells or "Never"', () => {
        const report: InactiveReport = { rows: [{ member: member(), lastVisit: null, daysSince: null, expiry: null }], days: 14 }
        const lines = inactiveCsv(report).split('\r\n')
        expect(lines[1]).toBe('Asha,GYM001,9999999999,Monthly,,No visit in 14d,14+')
    })
})

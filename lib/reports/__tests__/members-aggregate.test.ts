import { describe, it, expect } from 'vitest'
import {
    effectiveStatus, windowsFrom, isRenewed, latestPayment, firstPayment,
    joins, joinKpis, renewalsDue, lapsed, retentionBuckets, retentionTotals,
    churned, rosterCounts, planDistribution, inactive, historyRange,
    type ReportMemberRow, type PaymentStub, type MembershipWindow,
} from '@/lib/reports/members-aggregate'

const today = '2026-09-16'

function member(o: Partial<ReportMemberRow> = {}): ReportMemberRow {
    return {
        id: o.id ?? Math.random().toString(36).slice(2),
        member_code: 'GYM001',
        full_name: 'A',
        phone: '9999999999',
        status: 'active',
        plan_id: o.plan_name === null ? null : 'p1',
        plan_name: 'Monthly',
        plan_price: 1000,
        plan_duration_days: 30,
        membership_start_date: null,
        membership_expiry_date: null,
        referred_by: null,
        referrer_name: null,
        referral_coins_balance: 0,
        created_at: '2026-09-01T00:00:00Z',
        is_demo: false,
        ...o,
    }
}

function stub(o: Partial<PaymentStub> = {}): PaymentStub {
    return {
        member_id: 'm1',
        amount: 1000,
        payment_date: '2026-09-01',
        membership_start_date: '2026-09-01',
        membership_end_date: '2026-09-30',
        plan_name: 'Monthly',
        ...o,
    }
}

function win(o: Partial<MembershipWindow> & Pick<MembershipWindow, 'member_id' | 'start' | 'end'>): MembershipWindow {
    return { amount: 1000, payment_date: o.start, plan_name: 'Monthly', ...o }
}

// ─── historyRange ────────────────────────────────────────────────────────────

describe('historyRange', () => {
    it('always fetches from HISTORY_START to today, regardless of any selected range', () => {
        // The window fetch must reach all the way to today (not a selected
        // range's `to`) since a renewal can be paid after the selected
        // period — capping at `range.to` would miss it (F1 regression).
        expect(historyRange(today)).toEqual({ from: '2000-01-01', to: today })
    })
})

// ─── effectiveStatus ─────────────────────────────────────────────────────────

describe('effectiveStatus', () => {
    it('expiry today is expiring', () => {
        expect(effectiveStatus({ status: 'active', membership_expiry_date: today }, today)).toBe('expiring')
    })
    it('expiry today+7 is expiring', () => {
        expect(effectiveStatus({ status: 'active', membership_expiry_date: '2026-09-23' }, today)).toBe('expiring')
    })
    it('expiry today+8 is active', () => {
        expect(effectiveStatus({ status: 'active', membership_expiry_date: '2026-09-24' }, today)).toBe('active')
    })
    it('expiry yesterday is expired', () => {
        expect(effectiveStatus({ status: 'active', membership_expiry_date: '2026-09-15' }, today)).toBe('expired')
    })
    it('null expiry is expired', () => {
        expect(effectiveStatus({ status: 'active', membership_expiry_date: null }, today)).toBe('expired')
    })
    it('frozen overrides regardless of expiry', () => {
        expect(effectiveStatus({ status: 'frozen', membership_expiry_date: '2026-12-01' }, today)).toBe('frozen')
        expect(effectiveStatus({ status: 'frozen', membership_expiry_date: null }, today)).toBe('frozen')
    })
    it('inactive overrides regardless of expiry', () => {
        expect(effectiveStatus({ status: 'inactive', membership_expiry_date: '2026-12-01' }, today)).toBe('inactive')
        expect(effectiveStatus({ status: 'inactive', membership_expiry_date: null }, today)).toBe('inactive')
    })
})

// ─── windowsFrom ─────────────────────────────────────────────────────────────

describe('windowsFrom', () => {
    it('drops rows missing either date and sorts by start asc', () => {
        const rows = [
            stub({ member_id: 'm1', membership_start_date: '2026-09-10', membership_end_date: '2026-10-09' }),
            stub({ member_id: 'm1', membership_start_date: null }),
            stub({ member_id: 'm1', membership_end_date: null }),
            stub({ member_id: 'm2', membership_start_date: '2026-08-01', membership_end_date: '2026-08-31' }),
        ]
        const windows = windowsFrom(rows)
        expect(windows).toHaveLength(2)
        expect(windows.map((w) => w.start)).toEqual(['2026-08-01', '2026-09-10'])
    })
})

// ─── isRenewed ───────────────────────────────────────────────────────────────

describe('isRenewed', () => {
    const w1 = win({ member_id: 'm1', start: '2026-08-01', end: '2026-08-31' })
    it('next window starting exactly end+30 is renewed', () => {
        const w2 = win({ member_id: 'm1', start: '2026-09-30', end: '2026-10-29' })
        expect(isRenewed(w1, [w1, w2])).toBe(true)
    })
    it('next window starting end+31 is not renewed', () => {
        const w2 = win({ member_id: 'm1', start: '2026-10-01', end: '2026-10-31' })
        expect(isRenewed(w1, [w1, w2])).toBe(false)
    })
    it('a window starting before window.start does not count', () => {
        const before = win({ member_id: 'm1', start: '2026-07-01', end: '2026-07-31' })
        expect(isRenewed(w1, [w1, before])).toBe(false)
    })
})

// ─── latestPayment / firstPayment ────────────────────────────────────────────

describe('latestPayment / firstPayment', () => {
    const payments = [
        stub({ member_id: 'm1', payment_date: '2026-09-01', amount: 100 }),
        stub({ member_id: 'm1', payment_date: '2026-09-15', amount: 300 }),
        stub({ member_id: 'm2', payment_date: '2026-09-10', amount: 500 }),
    ]
    it('latestPayment picks the max payment_date for the member', () => {
        expect(latestPayment(payments, 'm1')?.amount).toBe(300)
    })
    it('firstPayment picks the min payment_date for the member', () => {
        expect(firstPayment(payments, 'm1')?.amount).toBe(100)
    })
    it('both return null when the member has no payments', () => {
        expect(latestPayment(payments, 'm3')).toBeNull()
        expect(firstPayment(payments, 'm3')).toBeNull()
    })
})

// ─── joins / joinKpis ────────────────────────────────────────────────────────

describe('joins', () => {
    const range = { from: '2026-09-01', to: '2026-09-16' }
    it('uses IST calendar date of created_at, tags source, picks first payment, newest first', () => {
        const m1 = member({ id: 'm1', created_at: '2026-09-15T20:00:00Z', referred_by: null, referrer_name: null })
        const m2 = member({ id: 'm2', created_at: '2026-09-10T04:00:00Z', referred_by: 'r2', referrer_name: 'Bob' })
        const m3 = member({ id: 'm3', created_at: '2026-08-31T20:00:00Z' }) // IST date 2026-09-01, still in range
        const m4 = member({ id: 'm4', created_at: '2026-08-31T04:00:00Z' }) // IST date 2026-08-31, out of range
        const payments = [
            stub({ member_id: 'm1', payment_date: '2026-09-16', amount: 500 }),
            stub({ member_id: 'm1', payment_date: '2026-09-20', amount: 700 }),
            stub({ member_id: 'm2', payment_date: '2026-09-10', amount: 1200 }),
        ]
        const rows = joins([m1, m2, m3, m4], payments, range)
        expect(rows.map((r) => r.member.id)).toEqual(['m1', 'm2', 'm3'])
        expect(rows[0].joinDate).toBe('2026-09-16')
        expect(rows[0].source).toBe('walk-in')
        expect(rows[0].firstPayment?.amount).toBe(500)
        expect(rows[1].source).toBe('referral')
        expect(rows[2].firstPayment).toBeNull()
    })
})

describe('joinKpis', () => {
    it('referralShare = 50 for 1 of 2 joins', () => {
        const range = { from: '2026-09-01', to: '2026-09-16' }
        const rows = joins(
            [
                member({ id: 'm1', created_at: '2026-09-05T00:00:00Z', referred_by: null, referrer_name: null }),
                member({ id: 'm2', created_at: '2026-09-06T00:00:00Z', referred_by: 'r2', referrer_name: 'Bob' }),
            ],
            [],
            range,
        )
        expect(joinKpis(rows)).toEqual({ joins: 2, referralShare: 50 })
    })
})

// ─── renewalsDue ─────────────────────────────────────────────────────────────

describe('renewalsDue', () => {
    it('horizon 7 includes today..+7, excludes +8/yesterday/frozen; sorted by expiry asc', () => {
        const members = [
            member({ id: 'm1', status: 'active', membership_expiry_date: today }),
            member({ id: 'm2', status: 'active', membership_expiry_date: '2026-09-23' }), // +7
            member({ id: 'm3', status: 'active', membership_expiry_date: '2026-09-24' }), // +8, excluded
            member({ id: 'm4', status: 'active', membership_expiry_date: '2026-09-15' }), // yesterday, expired, excluded
            member({ id: 'm5', status: 'frozen', membership_expiry_date: '2026-09-17' }), // frozen, excluded
        ]
        const rows = renewalsDue(members, [], today, 7)
        expect(rows.map((r) => r.member.id)).toEqual(['m1', 'm2'])
        expect(rows[0].daysLeft).toBe(0)
        expect(rows[1].daysLeft).toBe(7)
    })
})

// ─── lapsed ──────────────────────────────────────────────────────────────────

describe('lapsed', () => {
    const range = { from: '2026-09-01', to: '2026-09-16' }
    it('window ended in range and not renewed yields a row with overdueDays', () => {
        const m1 = member({ id: 'm1', membership_expiry_date: '2026-09-10' })
        const w1 = win({ member_id: 'm1', start: '2026-08-01', end: '2026-09-10' })
        const payments = [stub({ member_id: 'm1', payment_date: '2026-08-01' })]
        const rows = lapsed([m1], [w1], payments, range, today)
        expect(rows).toHaveLength(1)
        expect(rows[0].endedOn).toBe('2026-09-10')
        expect(rows[0].overdueDays).toBe(6)
    })
    it('excludes members whose current membership_expiry_date is >= today', () => {
        const m2 = member({ id: 'm2', membership_expiry_date: today })
        const w2renewed = win({ member_id: 'm2', start: '2026-08-01', end: '2026-09-05' })
        const w2new = win({ member_id: 'm2', start: '2026-09-06', end: today })
        const rows = lapsed([m2], [w2renewed, w2new], [], range, today)
        expect(rows).toHaveLength(0)
    })
    it('excludes renewed windows even when the member is not currently active', () => {
        const m4 = member({ id: 'm4', membership_expiry_date: '2026-09-01' })
        const w4a = win({ member_id: 'm4', start: '2026-08-01', end: '2026-09-03' })
        const w4b = win({ member_id: 'm4', start: '2026-09-20', end: '2026-10-19' }) // renews w4a (start <= end+30)
        const rows = lapsed([m4], [w4a, w4b], [], range, today)
        expect(rows).toHaveLength(0)
    })
    it('emits one row per member, keeping the latest ended window', () => {
        const wide = { from: '2026-01-01', to: '2026-09-16' }
        const m3 = member({ id: 'm3', membership_expiry_date: '2026-08-31' })
        const w3a = win({ member_id: 'm3', start: '2026-01-01', end: '2026-02-01' }) // far gap, not renewed by w3b
        const w3b = win({ member_id: 'm3', start: '2026-08-01', end: '2026-08-31' }) // also not renewed
        const rows = lapsed([m3], [w3a, w3b], [], wide, today)
        expect(rows).toHaveLength(1)
        expect(rows[0].endedOn).toBe('2026-08-31')
    })
})

// ─── retentionBuckets / retentionTotals ──────────────────────────────────────

describe('retentionBuckets / retentionTotals', () => {
    it('ended 2, renewed 1, retention 50, churned 1 for two windows ending in a month', () => {
        const range = { from: '2026-09-01', to: '2026-09-30' }
        const w1 = win({ member_id: 'm1', start: '2026-08-01', end: '2026-09-05' })
        const w1renewal = win({ member_id: 'm1', start: '2026-09-10', end: '2026-10-09' }) // renews w1, ends outside range
        const w2 = win({ member_id: 'm2', start: '2026-08-01', end: '2026-09-20' }) // not renewed
        const buckets = retentionBuckets([w1, w1renewal, w2], range, 'month')
        expect(buckets).toHaveLength(1)
        expect(buckets[0]).toMatchObject({ start: '2026-09-01', ended: 2, renewed: 1, retention: 50, churned: 1 })
        expect(retentionTotals(buckets)).toMatchObject({ ended: 2, renewed: 1, retention: 50, churned: 1 })
    })
    it('empty bucket has null retention', () => {
        const range = { from: '2026-09-01', to: '2026-09-30' }
        const buckets = retentionBuckets([], range, 'month')
        expect(buckets[0]).toMatchObject({ ended: 0, renewed: 0, retention: null, churned: 0 })
        expect(retentionTotals(buckets)).toMatchObject({ ended: 0, renewed: 0, retention: null, churned: 0 })
    })
    it('counts a window as renewed even when its renewal starts after range.to (F1 regression)', () => {
        // Window ends inside the range; its renewal starts after range.to.
        // A fetcher that capped the payment fetch at range.to would never
        // have produced this renewal window in the first place — this
        // asserts that once it's fed in, retentionBuckets counts it.
        const range = { from: '2026-09-01', to: '2026-09-16' }
        const w1 = win({ member_id: 'm1', start: '2026-08-01', end: '2026-09-05' })
        const w1renewal = win({ member_id: 'm1', start: '2026-09-20', end: '2026-10-19' }) // starts after range.to
        const buckets = retentionBuckets([w1, w1renewal], range, 'month')
        expect(buckets[0]).toMatchObject({ ended: 1, renewed: 1, retention: 100, churned: 0 })
    })
})

// ─── churned ─────────────────────────────────────────────────────────────────

describe('churned', () => {
    it('includes members who came back — no "came back" exclusion', () => {
        const range = { from: '2026-09-01', to: '2026-09-16' }
        const m1 = member({ id: 'm1', membership_expiry_date: today }) // currently active/came back
        const w1 = win({ member_id: 'm1', start: '2026-08-01', end: '2026-09-05' }) // not renewed
        const rows = churned([m1], [w1], [], range)
        expect(rows).toHaveLength(1)
        expect(rows[0].member.id).toBe('m1')
        expect(rows[0].endedOn).toBe('2026-09-05')
    })
    it('one row per member, latest window, end desc', () => {
        const range = { from: '2026-09-01', to: '2026-09-30' }
        const m1 = member({ id: 'm1' })
        const m2 = member({ id: 'm2' })
        const w1 = win({ member_id: 'm1', start: '2026-01-01', end: '2026-09-05' })
        const w1b = win({ member_id: 'm1', start: '2026-09-10', end: '2026-09-20' }) // far enough not to renew w1? within 30 days actually
        const w2 = win({ member_id: 'm2', start: '2026-01-01', end: '2026-09-25' })
        const rows = churned([m1, m2], [w1, w1b, w2], [], range)
        expect(rows.map((r) => r.member.id)).toEqual(['m2', 'm1'])
    })
})

// ─── rosterCounts ────────────────────────────────────────────────────────────

describe('rosterCounts', () => {
    it('counts members by effective status', () => {
        const members = [
            member({ status: 'active', membership_expiry_date: '2026-12-01' }),
            member({ status: 'active', membership_expiry_date: today }), // expiring
            member({ status: 'active', membership_expiry_date: '2026-09-01' }), // expired
            member({ status: 'frozen', membership_expiry_date: null }),
            member({ status: 'inactive', membership_expiry_date: null }),
        ]
        expect(rosterCounts(members, today)).toEqual({ active: 1, expiring: 1, expired: 1, frozen: 1, inactive: 1, total: 5 })
    })
})

// ─── planDistribution ────────────────────────────────────────────────────────

describe('planDistribution', () => {
    it('active/expiring only, share %, monthly value, "No plan" bucket, members desc', () => {
        const members = [
            member({ plan_id: 'p-q', plan_name: 'Quarterly', plan_price: 3000, plan_duration_days: 90, status: 'active', membership_expiry_date: '2026-12-01' }),
            member({ plan_id: 'p-q', plan_name: 'Quarterly', plan_price: 3000, plan_duration_days: 90, status: 'active', membership_expiry_date: today }),
            member({ plan_id: null, plan_name: null, plan_price: 0, plan_duration_days: 0, status: 'active', membership_expiry_date: '2026-12-01' }),
            member({ plan_id: 'p-q', plan_name: 'Quarterly', plan_price: 3000, plan_duration_days: 90, status: 'active', membership_expiry_date: '2026-09-01' }), // expired, excluded
        ]
        const rows = planDistribution(members, today)
        expect(rows).toHaveLength(2)
        expect(rows[0]).toMatchObject({ plan: 'Quarterly', members: 2, share: (2 / 3) * 100, price: 3000, durationDays: 90, monthlyValue: 1000 })
        expect(rows[1]).toMatchObject({ plan: 'No plan', members: 1, price: 0, durationDays: 0, monthlyValue: 0 })
    })
    it('groups by plan_id, not plan_name — two different plans with the same name stay separate', () => {
        const members = [
            member({ plan_id: 'p1', plan_name: 'Monthly', plan_price: 1000, plan_duration_days: 30, status: 'active', membership_expiry_date: '2026-12-01' }),
            member({ plan_id: 'p2', plan_name: 'Monthly', plan_price: 1200, plan_duration_days: 30, status: 'active', membership_expiry_date: '2026-12-01' }),
        ]
        const rows = planDistribution(members, today)
        expect(rows).toHaveLength(2)
        expect(rows.every((r) => r.members === 1)).toBe(true)
    })
})

// ─── inactive ────────────────────────────────────────────────────────────────

describe('inactive', () => {
    it('never-visited first, then oldest visit; boundary at N days; excludes expired', () => {
        const mNever = member({ id: 'never', status: 'active', membership_expiry_date: '2026-12-01' })
        const mRecent = member({ id: 'recent', status: 'active', membership_expiry_date: '2026-12-01' }) // today-13, excluded
        const mBoundary = member({ id: 'boundary', status: 'active', membership_expiry_date: '2026-12-01' }) // today-14, included
        const mOldest = member({ id: 'oldest', status: 'active', membership_expiry_date: '2026-12-01' }) // older still
        const mExpired = member({ id: 'expired', status: 'active', membership_expiry_date: '2026-09-01' }) // expired, excluded

        const lastVisits = new Map<string, string>([
            ['recent', '2026-09-03'],
            ['boundary', '2026-09-02'],
            ['oldest', '2026-08-01'],
            ['expired', '2026-08-01'],
        ])
        const rows = inactive([mNever, mRecent, mBoundary, mOldest, mExpired], lastVisits, today, 14)
        expect(rows.map((r) => r.member.id)).toEqual(['never', 'oldest', 'boundary'])
        expect(rows[0].lastVisit).toBeNull()
        expect(rows[0].daysSince).toBeNull()
        expect(rows[1].daysSince).toBeGreaterThan(rows[2].daysSince as number)
        expect(rows[2].daysSince).toBe(14)
    })
})

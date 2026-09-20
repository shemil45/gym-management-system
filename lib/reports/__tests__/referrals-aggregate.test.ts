import { describe, it, expect } from 'vitest'
import {
    overviewBuckets, overviewTotals, overviewKpis, outstandingBalance, leaderboard, referralList,
    funnel, netCoins, daysToConvert, conversionTiming, referredRevenue, joinMix, joinMixBuckets, referrerActivity, leaderboardTotals,
    type ReportReferralRow,
} from '@/lib/reports/referrals-aggregate'
import type { ReportMemberRow } from '@/lib/reports/members-aggregate'
import type { ReportPaymentRow } from '@/lib/reports/payments-aggregate'

const BONUS = 500
const JAN_MAR = { from: '2026-01-01', to: '2026-03-31' }

function referral(o: Partial<ReportReferralRow> = {}): ReportReferralRow {
    return {
        id: 'r1',
        referrer_id: 'm-referrer',
        referred_id: 'm-referred',
        code: 'CODE1',
        status: 'pending',
        created_at: '2026-01-10T10:00:00Z',
        applied_at: null,
        referrer_name: 'Referrer',
        referrer_code: 'GYM001',
        referrer_phone: '9000000000',
        referred_name: 'Referred',
        referred_code: 'GYM002',
        ...o,
    }
}

function payment(o: Partial<ReportPaymentRow> = {}): ReportPaymentRow {
    return {
        id: 'p1',
        amount: 1000,
        admission_fee_amount: null,
        referral_coins_used: 0,
        payment_method: 'cash',
        payment_status: 'paid',
        payment_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
        receipt_number: null,
        invoice_number: null,
        notes: null,
        member_id: 'm1',
        member_name: 'Member',
        member_code: 'GYM001',
        member_phone: '9000000000',
        member_joined: null,
        plan_name: 'Monthly',
        processor_name: null,
        membership_start_date: null,
        membership_end_date: null,
        is_demo: false,
        ...o,
    }
}

function member(o: Partial<ReportMemberRow> = {}): ReportMemberRow {
    return {
        id: 'm1',
        member_code: 'GYM001',
        full_name: 'A',
        phone: '9999999999',
        status: 'active',
        plan_id: 'p1',
        plan_name: 'Monthly',
        plan_price: 1000,
        plan_duration_days: 30,
        membership_start_date: null,
        membership_expiry_date: null,
        referred_by: null,
        referrer_name: null,
        referral_coins_balance: 0,
        created_at: '2026-01-01T00:00:00Z',
        is_demo: false,
        ...o,
    }
}

describe('overviewBuckets', () => {
    it('counts conversion by applied_at even when the referral was created before the range, and conversion is null when nothing was created in that bucket', () => {
        const a = referral({ id: 'a', status: 'applied', created_at: '2025-12-20T10:00:00Z', applied_at: '2026-01-05T10:00:00Z' })
        const buckets = overviewBuckets([a], [], JAN_MAR, 'month', BONUS)
        const jan = buckets.find((b) => b.start === '2026-01-01')!
        expect(jan.created).toBe(0)
        expect(jan.converted).toBe(1)
        expect(jan.conversion).toBeNull()
        expect(jan.coinsIssued).toBe(BONUS)
    })

    it('counts pending/expired by created bucket and current status', () => {
        const b = referral({ id: 'b', status: 'pending', created_at: '2026-01-10T10:00:00Z', applied_at: null })
        const c = referral({ id: 'c', status: 'expired', created_at: '2026-02-01T10:00:00Z', applied_at: null })
        const buckets = overviewBuckets([b, c], [], JAN_MAR, 'month', BONUS)
        const jan = buckets.find((bk) => bk.start === '2026-01-01')!
        const feb = buckets.find((bk) => bk.start === '2026-02-01')!
        expect(jan.created).toBe(1)
        expect(jan.pending).toBe(1)
        expect(jan.converted).toBe(0)
        expect(jan.conversion).toBe(0)
        expect(feb.created).toBe(1)
        expect(feb.expired).toBe(1)
        expect(feb.conversion).toBe(0)
    })

    it('sums referral_coins_used over paid payments only, bucketed by payment_date', () => {
        const paid = payment({ id: 'p1', payment_date: '2026-01-15', payment_status: 'paid', referral_coins_used: 200 })
        const pending = payment({ id: 'p2', payment_date: '2026-01-20', payment_status: 'pending', referral_coins_used: 300 })
        const buckets = overviewBuckets([], [paid, pending], JAN_MAR, 'month', BONUS)
        const jan = buckets.find((b) => b.start === '2026-01-01')!
        expect(jan.coinsRedeemed).toBe(200)
    })

    it('produces one bucket per month across the range, even for months with no data', () => {
        const buckets = overviewBuckets([], [], JAN_MAR, 'month', BONUS)
        expect(buckets.map((b) => b.start)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
    })
})

describe('overviewTotals', () => {
    it('sums buckets and recomputes conversion from the totals', () => {
        const buckets = overviewBuckets(
            [
                referral({ id: 'a', status: 'applied', created_at: '2025-12-20T10:00:00Z', applied_at: '2026-01-05T10:00:00Z' }),
                referral({ id: 'b', status: 'pending', created_at: '2026-01-10T10:00:00Z' }),
            ],
            [],
            JAN_MAR,
            'month',
            BONUS,
        )
        const totals = overviewTotals(buckets)
        expect(totals.created).toBe(1)
        expect(totals.converted).toBe(1)
        expect(totals.conversion).toBe(100)
    })

    it('conversion is null when nothing was created across the whole range', () => {
        const buckets = overviewBuckets([], [], JAN_MAR, 'month', BONUS)
        expect(overviewTotals(buckets).conversion).toBeNull()
    })
})

describe('overviewKpis', () => {
    it('computes referrals/conversions/coins over the range directly', () => {
        const a = referral({ id: 'a', status: 'applied', created_at: '2025-12-20T10:00:00Z', applied_at: '2026-01-05T10:00:00Z' })
        const b = referral({ id: 'b', status: 'pending', created_at: '2026-01-10T10:00:00Z' })
        const paid = payment({ id: 'p1', payment_date: '2026-01-15', payment_status: 'paid', referral_coins_used: 200 })
        const kpis = overviewKpis([a, b], [paid], JAN_MAR, BONUS)
        expect(kpis.referrals).toBe(1)
        expect(kpis.conversions).toBe(1)
        expect(kpis.coinsIssued).toBe(BONUS)
        expect(kpis.coinsRedeemed).toBe(200)
    })
})

describe('outstandingBalance', () => {
    it('sums referral_coins_balance across all members', () => {
        const members = [member({ id: 'm1', referral_coins_balance: 500 }), member({ id: 'm2', referral_coins_balance: 300 })]
        expect(outstandingBalance(members)).toBe(800)
    })
})

describe('leaderboard', () => {
    it('groups referrals created in range by referrer, computes cohort conversion, and reads balance from the member row', () => {
        const members = [
            member({ id: 'r1', full_name: 'Alice', referral_coins_balance: 1000 }),
            member({ id: 'r2', full_name: 'Bob', referral_coins_balance: 500 }),
        ]
        const referrals = [
            referral({ id: 'a1', referrer_id: 'r1', status: 'applied', created_at: '2026-01-05T00:00:00Z', applied_at: '2026-01-10T00:00:00Z' }),
            referral({ id: 'a2', referrer_id: 'r1', status: 'pending', created_at: '2026-01-06T00:00:00Z' }),
            referral({ id: 'b1', referrer_id: 'r2', status: 'applied', created_at: '2026-01-07T00:00:00Z', applied_at: '2026-01-12T00:00:00Z' }),
        ]
        const rows = leaderboard(referrals, members, JAN_MAR, BONUS)
        expect(rows).toHaveLength(2)
        const alice = rows.find((r) => r.member.id === 'r1')!
        expect(alice.referrals).toBe(2)
        expect(alice.converted).toBe(1)
        expect(alice.conversion).toBe(50)
        expect(alice.coinsEarned).toBe(BONUS)
        expect(alice.balance).toBe(1000)
    })

    it('sorts by converted desc, then referrals desc, then name asc; skips referrers not in the roster', () => {
        const members = [
            member({ id: 'r1', full_name: 'Zed' }),
            member({ id: 'r2', full_name: 'Amy' }),
        ]
        const referrals = [
            // r1: 1 converted, 1 referral
            referral({ id: 'a1', referrer_id: 'r1', status: 'applied', created_at: '2026-01-01T00:00:00Z', applied_at: '2026-01-02T00:00:00Z' }),
            // r2: 1 converted, 1 referral, name sorts before Zed on tie
            referral({ id: 'b1', referrer_id: 'r2', status: 'applied', created_at: '2026-01-01T00:00:00Z', applied_at: '2026-01-02T00:00:00Z' }),
            // referrer not in the roster
            referral({ id: 'c1', referrer_id: 'ghost', status: 'pending', created_at: '2026-01-01T00:00:00Z' }),
        ]
        const rows = leaderboard(referrals, members, JAN_MAR, BONUS)
        expect(rows.map((r) => r.member.full_name)).toEqual(['Amy', 'Zed'])
    })
})

describe('referralList', () => {
    it('includes only referrals created in range, filters by status, newest first', () => {
        const inRange = referral({ id: 'in', status: 'pending', created_at: '2026-02-01T00:00:00Z' })
        const outOfRange = referral({ id: 'out', status: 'pending', created_at: '2025-12-01T00:00:00Z' })
        const applied = referral({ id: 'applied', status: 'applied', created_at: '2026-03-01T00:00:00Z', applied_at: '2026-03-05T00:00:00Z' })
        const rows = referralList([inRange, outOfRange, applied], JAN_MAR, 'pending')
        expect(rows.map((r) => r.id)).toEqual(['in'])
    })

    it('sorts newest first across statuses when status is all', () => {
        const first = referral({ id: 'first', created_at: '2026-01-01T00:00:00Z' })
        const second = referral({ id: 'second', created_at: '2026-02-01T00:00:00Z' })
        const rows = referralList([first, second], JAN_MAR, 'all')
        expect(rows.map((r) => r.id)).toEqual(['second', 'first'])
    })

    it('computes daysToConvert from created to applied in IST days, null when pending', () => {
        const applied = referral({ id: 'applied', status: 'applied', created_at: '2026-01-01T00:00:00Z', applied_at: '2026-01-04T00:00:00Z' })
        const pending = referral({ id: 'pending', status: 'pending', created_at: '2026-01-05T00:00:00Z', applied_at: null })
        const rows = referralList([applied, pending], JAN_MAR, 'all')
        const appliedRow = rows.find((r) => r.id === 'applied')!
        const pendingRow = rows.find((r) => r.id === 'pending')!
        expect(appliedRow.daysToConvert).toBe(3)
        expect(pendingRow.daysToConvert).toBeNull()
    })
})

// ═══ Analytics layer ═════════════════════════════════════════════════════════

const q1 = { from: '2026-01-01', to: '2026-03-31' }

describe('funnel / netCoins reconcile with the overview', () => {
    it('funnel counts equal the overview totals and coins issued is conversions × bonus', () => {
        const referrals = [
            referral({ id: 'a', created_at: '2026-01-10T10:00:00Z', applied_at: '2026-01-12T10:00:00Z', status: 'applied' }),
            referral({ id: 'b', created_at: '2026-02-10T10:00:00Z' }),
            referral({ id: 'c', created_at: '2026-02-11T10:00:00Z', applied_at: '2026-03-20T10:00:00Z', status: 'applied' }),
        ]
        const buckets = overviewBuckets(referrals, [], q1, 'month', BONUS)
        const totals = overviewTotals(buckets)
        const kpis = overviewKpis(referrals, [], q1, BONUS)
        const f = funnel(totals, BONUS)
        expect(f).toEqual({ created: 3, converted: 2, coinsIssued: 1000, bonus: BONUS })
        expect(f.created).toBe(kpis.referrals)
        expect(f.converted).toBe(kpis.conversions)
        expect(f.coinsIssued).toBe(kpis.coinsIssued)
        // Trend buckets sum to the period totals.
        expect(buckets.reduce((s, b) => s + b.created, 0)).toBe(totals.created)
        expect(buckets.reduce((s, b) => s + b.converted, 0)).toBe(totals.converted)
        expect(totals.conversion).toBeCloseTo((2 / 3) * 100)
        expect(netCoins(kpis.coinsIssued, kpis.coinsRedeemed)).toBe(1000)
    })
    it('a period with no referrals has null rates, not NaN', () => {
        const buckets = overviewBuckets([], [], q1, 'month', BONUS)
        const totals = overviewTotals(buckets)
        expect(totals.conversion).toBeNull()
        for (const b of buckets) expect(b.conversion).toBeNull()
        expect(funnel(totals, BONUS)).toEqual({ created: 0, converted: 0, coinsIssued: 0, bonus: BONUS })
        expect(conversionTiming([], q1)).toMatchObject({ converted: 0, avgDays: null, medianDays: null })
        expect(joinMix([], q1).share).toBeNull()
        expect(leaderboardTotals([]).conversion).toBeNull()
    })
})

describe('conversionTiming', () => {
    it('uses the list column formula and buckets converted referrals', () => {
        const rows = [
            referral({ id: 'same', created_at: '2026-01-10T03:00:00Z', applied_at: '2026-01-10T12:00:00Z', status: 'applied' }),
            referral({ id: 'two', created_at: '2026-01-10T03:00:00Z', applied_at: '2026-01-12T03:00:00Z', status: 'applied' }),
            referral({ id: 'ten', created_at: '2026-01-01T03:00:00Z', applied_at: '2026-01-11T03:00:00Z', status: 'applied' }),
            referral({ id: 'long', created_at: '2025-11-01T03:00:00Z', applied_at: '2026-02-01T03:00:00Z', status: 'applied' }),
            referral({ id: 'pending', created_at: '2026-01-05T03:00:00Z' }),
            referral({ id: 'outside', created_at: '2025-12-01T03:00:00Z', applied_at: '2025-12-05T03:00:00Z', status: 'applied' }),
            referral({ id: 'bad', created_at: '2026-01-20T03:00:00Z', applied_at: '2026-01-15T03:00:00Z', status: 'applied' }),
        ]
        for (const r of rows) {
            const listed = referralList([r], { from: '2025-01-01', to: '2026-12-31' }, 'all')[0].daysToConvert
            if (listed !== null && listed >= 0) expect(daysToConvert(r)).toBe(listed)
        }
        const timing = conversionTiming(rows, q1)
        expect(timing.converted).toBe(4)
        expect(timing.buckets.map((b) => [b.id, b.referrals])).toEqual([['same-day', 1], ['1-3', 1], ['4-7', 0], ['8-30', 1], ['30+', 1]])
        expect(timing.avgDays).toBeCloseTo((0 + 2 + 10 + 92) / 4)
        expect(timing.medianDays).toBe(6)
        expect(timing.buckets.reduce((s, b) => s + b.referrals, 0)).toBe(timing.converted)
    })
})

describe('referredRevenue / joinMix', () => {
    it('sums paid amounts from members with a referrer and shares against all collected', () => {
        const members = [member({ id: 'ref', referred_by: 'someone' }), member({ id: 'walk' })]
        const payments = [
            payment({ member_id: 'ref', amount: 1000 }), payment({ member_id: 'ref', amount: 500 }),
            payment({ member_id: 'walk', amount: 1500 }),
            payment({ member_id: 'ref', amount: 999, payment_status: 'pending' }),
        ]
        expect(referredRevenue(payments, members)).toEqual({ revenue: 1500, txns: 2, payingMembers: 1, avgPerPayingMember: 1500, collected: 3000, shareOfCollected: 50 })
    })
    it('counts joins in the range by the members report join-date rule, bucketed', () => {
        const members = [
            member({ id: 'a', referred_by: 'x', created_at: '2026-01-05T00:00:00Z' }),
            member({ id: 'b', created_at: '2026-01-06T00:00:00Z' }),
            member({ id: 'c', referred_by: 'x', created_at: '2026-03-06T00:00:00Z' }),
            member({ id: 'old', referred_by: 'x', created_at: '2025-06-01T00:00:00Z' }),
        ]
        expect(joinMix(members, q1)).toEqual({ joins: 3, referred: 2, share: (2 / 3) * 100 })
        const buckets = joinMixBuckets(members, q1, 'month')
        expect(buckets.map((b) => [b.joins, b.referred, b.share])).toEqual([[2, 1, 50], [0, 0, null], [1, 1, 100]])
        expect(buckets.reduce((s, b) => s + b.joins, 0)).toBe(joinMix(members, q1).joins)
    })
})

describe('referrerActivity / leaderboardTotals', () => {
    it('keeps the largest referrers, folds the rest, and totals reconcile with the rows', () => {
        const members = Array.from({ length: 10 }, (_, i) => member({ id: `m${i}`, full_name: `Member ${i}` }))
        const referrals = members.flatMap((m, i) => Array.from({ length: 10 - i }, (_, k) => referral({
            id: `${m.id}-${k}`, referrer_id: m.id, created_at: '2026-01-10T10:00:00Z',
            ...(k === 0 ? { applied_at: '2026-01-12T10:00:00Z', status: 'applied' as const } : {}),
        })))
        const rows = leaderboard(referrals, members, q1, BONUS)
        const totals = leaderboardTotals(rows)
        expect(totals).toEqual({ referrers: 10, referrals: 55, converted: 10, conversion: (10 / 55) * 100 })
        const activity = referrerActivity(rows, 8)
        expect(activity).toHaveLength(9)
        expect(activity[8]).toMatchObject({ label: 'Other (2)', referrals: 3, converted: 2, isOther: true })
        expect(activity.reduce((s, a) => s + a.referrals, 0)).toBe(totals.referrals)
        expect(activity.reduce((s, a) => s + a.converted, 0)).toBe(totals.converted)
        // Leaderboard referrals equal the overview's created count when every
        // referrer is a known member.
        expect(totals.referrals).toBe(overviewKpis(referrals, [], q1, BONUS).referrals)
    })
})

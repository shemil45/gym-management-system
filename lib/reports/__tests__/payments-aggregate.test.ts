import { describe, it, expect } from 'vitest'
import {
    dayBookTotals, sortForDayBook, summarise, kpis, deltaPercent, byPlan,
    pendingRows, pendingTotals, byStaff, type ReportPaymentRow,
    statusKpis, byMethod, classifyMembership, newVsRenewal, payingMembers, revenueConcentration,
    splitOutstanding, ageInDays, ageing, staffMethods, unassignedCollections, planAnalysis,
} from '@/lib/reports/payments-aggregate'

function row(overrides: Partial<ReportPaymentRow>): ReportPaymentRow {
    return {
        id: overrides.id ?? Math.random().toString(36).slice(2),
        amount: 1000,
        admission_fee_amount: null,
        referral_coins_used: 0,
        payment_method: 'cash',
        payment_status: 'paid',
        payment_date: '2026-09-15',
        created_at: '2026-09-15T04:00:00Z',
        receipt_number: null,
        invoice_number: null,
        notes: null,
        member_id: 'm1',
        member_name: 'A',
        member_code: 'GYM001',
        member_phone: '9999999999',
        member_joined: '2026-09-15',
        plan_name: 'Monthly',
        processor_name: 'Staff One',
        membership_start_date: null,
        membership_end_date: null,
        is_demo: false,
        ...overrides,
    }
}

describe('dayBookTotals', () => {
    it('collects only paid rows and splits by method', () => {
        const t = dayBookTotals([
            row({ amount: 500, payment_method: 'cash' }),
            row({ amount: 700, payment_method: 'upi' }),
            row({ amount: 300, payment_status: 'pending' }),
            row({ amount: 200, payment_status: 'failed' }),
            row({ amount: 100, payment_status: 'refunded' }),
        ])
        expect(t.collected).toBe(1200)
        expect(t.paidCount).toBe(2)
        expect(t.byMethod).toEqual({ cash: 500, upi: 700, card: 0, bank_transfer: 0, online: 0 })
        expect(t.pendingCount).toBe(2)
        expect(t.pendingAmount).toBe(500)
        expect(t.refundedCount).toBe(1)
        expect(t.refundedAmount).toBe(100)
    })
})

describe('sortForDayBook', () => {
    it('orders by created_at ascending without mutating', () => {
        const a = row({ id: 'a', created_at: '2026-09-15T09:00:00Z' })
        const b = row({ id: 'b', created_at: '2026-09-15T03:00:00Z' })
        const input = [a, b]
        expect(sortForDayBook(input).map((r) => r.id)).toEqual(['b', 'a'])
        expect(input[0].id).toBe('a')
    })
})

describe('summarise', () => {
    it('emits every day bucket including empty ones, with fee split', () => {
        const buckets = summarise(
            [
                row({ payment_date: '2026-09-14', amount: 1500, admission_fee_amount: 500, referral_coins_used: 50 }),
                row({ payment_date: '2026-09-14', amount: 200, payment_status: 'refunded' }),
            ],
            { from: '2026-09-13', to: '2026-09-15' },
            'day',
        )
        expect(buckets.map((b) => b.start)).toEqual(['2026-09-13', '2026-09-14', '2026-09-15'])
        expect(buckets[1]).toMatchObject({
            label: '14 Sep', txns: 1, collected: 1500, admissionFees: 500, membershipRevenue: 1000,
            coinsRedeemed: 50, refunded: 200,
        })
        expect(buckets[0].txns).toBe(0)
    })
    it('week buckets start on Monday and cover the range', () => {
        const buckets = summarise(
            [row({ payment_date: '2026-09-02' })],
            { from: '2026-09-01', to: '2026-09-20' },
            'week',
        )
        expect(buckets.map((b) => b.start)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14'])
        expect(buckets[0].collected).toBe(1000)
    })
    it('month buckets cross a year boundary', () => {
        const buckets = summarise([], { from: '2025-11-15', to: '2026-02-10' }, 'month')
        expect(buckets.map((b) => b.label)).toEqual(['Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026'])
    })
    it('counts a refunded row in refunded, not in txns/collected', () => {
        const buckets = summarise(
            [row({ payment_date: '2026-09-14', amount: 400, payment_status: 'refunded' })],
            { from: '2026-09-13', to: '2026-09-15' },
            'day',
        )
        expect(buckets[1]).toMatchObject({ txns: 0, collected: 0, refunded: 400 })
    })
    it('ignores a row whose payment_date is outside the range', () => {
        const buckets = summarise(
            [row({ payment_date: '2026-09-20', amount: 900 })],
            { from: '2026-09-13', to: '2026-09-15' },
            'day',
        )
        expect(buckets.every((b) => b.txns === 0 && b.collected === 0)).toBe(true)
    })
})

describe('kpis / deltaPercent', () => {
    it('avg ticket is 0 with no paid rows', () => {
        expect(kpis([row({ payment_status: 'pending' })])).toEqual({ collected: 0, txns: 0, avgTicket: 0 })
        expect(kpis([row({ amount: 300 }), row({ amount: 500 })])).toEqual({ collected: 800, txns: 2, avgTicket: 400 })
    })
    it('delta is null when previous is zero', () => {
        expect(deltaPercent(100, 0)).toBeNull()
        expect(deltaPercent(150, 100)).toBe(50)
        expect(deltaPercent(50, 100)).toBe(-50)
        expect(deltaPercent(-500, -1000)).toBe(50)
        expect(deltaPercent(-2000, -1000)).toBe(-100)
    })
    it('delta is -100 when the current value drops to zero', () => {
        expect(deltaPercent(0, 100)).toBe(-100)
    })
})

describe('byPlan', () => {
    it('groups paid rows, sorts by revenue, computes share', () => {
        const rows = byPlan([
            row({ plan_name: 'Monthly', amount: 1000 }),
            row({ plan_name: 'Yearly', amount: 3000 }),
            row({ plan_name: null, amount: 1000 }),
            row({ plan_name: 'Monthly', amount: 1000, payment_status: 'pending' }),
        ])
        expect(rows.map((r) => r.plan)).toEqual(['Yearly', 'Monthly', 'No plan'])
        expect(rows[0]).toEqual({ plan: 'Yearly', txns: 1, revenue: 3000, share: 60 })
    })
})

describe('pending', () => {
    it('keeps pending and failed, newest first', () => {
        const rows = pendingRows([
            row({ id: 'p1', payment_status: 'pending', payment_date: '2026-09-10', amount: 100 }),
            row({ id: 'f1', payment_status: 'failed', payment_date: '2026-09-12', amount: 200 }),
            row({ id: 'ok', payment_status: 'paid' }),
            row({ id: 'r', payment_status: 'refunded' }),
        ])
        expect(rows.map((r) => r.id)).toEqual(['f1', 'p1'])
        expect(pendingTotals(rows)).toEqual({ count: 2, amount: 300 })
    })
})

describe('byStaff', () => {
    it('groups paid rows by processor with a cash column', () => {
        const rows = byStaff([
            row({ processor_name: 'S1', amount: 500, payment_method: 'cash' }),
            row({ processor_name: 'S1', amount: 500, payment_method: 'upi' }),
            row({ processor_name: null, amount: 100 }),
            row({ processor_name: 'S1', amount: 999, payment_status: 'failed' }),
        ])
        expect(rows).toEqual([
            { staff: 'S1', txns: 2, collected: 1000, cash: 500 },
            { staff: 'Unassigned', txns: 1, collected: 100, cash: 100 },
        ])
    })
})

// ═══ Analytics layer ═════════════════════════════════════════════════════════

describe('statusKpis', () => {
    it('counts attempts as paid + pending + failed, never refunds', () => {
        const s = statusKpis([
            row({ amount: 500 }), row({ amount: 700 }),
            row({ amount: 300, payment_status: 'pending' }),
            row({ amount: 200, payment_status: 'failed' }),
            row({ amount: 100, payment_status: 'refunded' }),
        ])
        expect(s).toMatchObject({ attempts: 4, successful: 2, successRate: 50, failed: 1, failedAmount: 200, pending: 1, pendingAmount: 300, refunded: 1, refundedAmount: 100 })
    })
    it('has no success rate without attempts', () => {
        expect(statusKpis([row({ payment_status: 'refunded' })]).successRate).toBeNull()
    })
})

describe('byMethod', () => {
    it('reconciles with the summary table per-method totals', () => {
        const rows = [
            row({ amount: 500, payment_method: 'cash' }), row({ amount: 700, payment_method: 'upi' }), row({ amount: 300, payment_method: 'upi' }),
            row({ amount: 999, payment_method: 'card', payment_status: 'pending' }),
        ]
        const methods = byMethod(rows)
        const bucket = summarise(rows, { from: '2026-09-15', to: '2026-09-15' }, 'day')[0]
        for (const m of methods) expect(m.amount).toBe(bucket.byMethod[m.method])
        expect(methods.map((m) => m.method)).toEqual(['upi', 'cash', 'card', 'bank_transfer', 'online'])
        expect(methods[0]).toMatchObject({ txns: 2, amount: 1000, share: (1000 / 1500) * 100 })
        expect(methods.reduce((s, m) => s + m.amount, 0)).toBe(kpis(rows).collected)
    })
})

describe('newVsRenewal', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' }
    const membership = { membership_start_date: '2026-09-10', membership_end_date: '2026-10-09' }

    it('rule 1: no membership window or no member → unclassified', () => {
        expect(classifyMembership(row({}), [], range)).toBe('unclassified')
        expect(classifyMembership(row({ ...membership, member_joined: null }), [], range)).toBe('unclassified')
    })
    it('rule 2: an earlier paid membership payment in the rows → renewal', () => {
        const first = row({ id: 'a', ...membership, payment_date: '2026-09-01', member_joined: '2026-09-01' })
        const second = row({ id: 'b', ...membership, payment_date: '2026-09-20', member_joined: '2026-09-01' })
        expect(classifyMembership(first, [first, second], range)).toBe('new')
        expect(classifyMembership(second, [first, second], range)).toBe('renewal')
    })
    it('rule 3: joined inside the range with no earlier payment → new', () => {
        expect(classifyMembership(row({ ...membership, member_joined: '2026-09-10' }), [], range)).toBe('new')
    })
    it('rule 4: joined before the range with no earlier payment in it → renewal', () => {
        expect(classifyMembership(row({ ...membership, member_joined: '2026-03-01' }), [], range)).toBe('renewal')
    })
    it('ignores pending rows and same-day ordering uses created_at', () => {
        const pending = row({ id: 'p', ...membership, payment_status: 'pending', payment_date: '2026-09-01', member_joined: '2026-09-01' })
        const paid = row({ id: 'q', ...membership, payment_date: '2026-09-20', member_joined: '2026-09-01' })
        expect(classifyMembership(paid, [pending, paid], range)).toBe('new')

        const early = row({ id: 'e', ...membership, payment_date: '2026-09-20', created_at: '2026-09-20T03:00:00Z', member_joined: '2026-09-01' })
        const late = row({ id: 'l', ...membership, payment_date: '2026-09-20', created_at: '2026-09-20T05:00:00Z', member_joined: '2026-09-01' })
        expect(classifyMembership(early, [early, late], range)).toBe('new')
        expect(classifyMembership(late, [early, late], range)).toBe('renewal')
    })
    it('sums to the collected total across the three kinds', () => {
        const rows = [
            row({ amount: 1000, ...membership, member_joined: '2026-09-10' }),
            row({ amount: 2000, ...membership, member_id: 'm2', member_joined: '2025-01-01' }),
            row({ amount: 300, member_id: 'm3' }),
            row({ amount: 999, payment_status: 'failed' }),
        ]
        const kinds = newVsRenewal(rows, range)
        expect(kinds.map((k) => [k.kind, k.txns, k.amount])).toEqual([['new', 1, 1000], ['renewal', 1, 2000], ['unclassified', 1, 300]])
        expect(kinds.reduce((s, k) => s + k.amount, 0)).toBe(kpis(rows).collected)
        expect(kinds.reduce((s, k) => s + k.share, 0)).toBeCloseTo(100)
    })
})

describe('payingMembers / revenueConcentration', () => {
    it('divides collected by distinct paying members', () => {
        const p = payingMembers([row({ amount: 600 }), row({ amount: 400 }), row({ amount: 500, member_id: 'm2' }), row({ amount: 9, member_id: 'm3', payment_status: 'pending' })])
        expect(p).toEqual({ members: 2, revenuePerMember: 750 })
        expect(payingMembers([])).toEqual({ members: 0, revenuePerMember: 0 })
    })
    it('needs ten paying members and takes the top 10% by amount', () => {
        const nine = Array.from({ length: 9 }, (_, i) => row({ member_id: `m${i}`, amount: 100 }))
        expect(revenueConcentration(nine)).toBeNull()
        const ten = [...nine, row({ member_id: 'big', amount: 900 })]
        expect(revenueConcentration(ten)).toEqual({ topFraction: 0.1, topMembers: 1, members: 10, revenueShare: 50 })
    })
})

describe('splitOutstanding / ageing', () => {
    const today = '2026-09-20'
    it('separates pending from failed, both newest first', () => {
        const split = splitOutstanding([
            row({ id: 'p1', payment_status: 'pending', payment_date: '2026-09-10' }),
            row({ id: 'p2', payment_status: 'pending', payment_date: '2026-09-12' }),
            row({ id: 'f1', payment_status: 'failed', payment_date: '2026-09-11' }),
            row({ id: 'ok' }),
        ])
        expect(split.pending.map((r) => r.id)).toEqual(['p2', 'p1'])
        expect(split.failed.map((r) => r.id)).toEqual(['f1'])
    })
    it('ages by the IST date the row was recorded, not payment_date', () => {
        // 18:31 UTC on the 19th is already the 20th in IST → recorded today.
        expect(ageInDays(row({ created_at: '2026-09-19T18:31:00Z', payment_date: '2026-09-01' }), today)).toBe(0)
        expect(ageInDays(row({ created_at: '2026-09-19T18:29:00Z' }), today)).toBe(1)
        expect(ageInDays(row({ created_at: '2026-09-25T00:00:00Z' }), today)).toBe(0)
    })
    it('buckets today / 1–3 / 4–7 / over 7 by status', () => {
        const buckets = ageing([
            row({ payment_status: 'pending', amount: 10, created_at: '2026-09-20T04:00:00Z' }),
            row({ payment_status: 'failed', amount: 20, created_at: '2026-09-18T04:00:00Z' }),
            row({ payment_status: 'pending', amount: 30, created_at: '2026-09-15T04:00:00Z' }),
            row({ payment_status: 'pending', amount: 40, created_at: '2026-09-01T04:00:00Z' }),
            row({ payment_status: 'paid', amount: 999 }),
        ], today)
        expect(buckets.map((b) => [b.id, b.pendingAmount, b.failedAmount])).toEqual([['today', 10, 0], ['1-3', 0, 20], ['4-7', 30, 0], ['8+', 40, 0]])
        expect(buckets.reduce((s, b) => s + b.pendingAmount + b.failedAmount, 0)).toBe(100)
    })
})

describe('staffMethods / unassignedCollections', () => {
    it('lines up with byStaff and splits each collector by method', () => {
        const rows = [
            row({ processor_name: 'S1', amount: 500, payment_method: 'cash' }),
            row({ processor_name: 'S1', amount: 500, payment_method: 'upi' }),
            row({ processor_name: null, amount: 100 }),
            row({ processor_name: null, amount: 7, payment_status: 'failed' }),
        ]
        const methods = staffMethods(rows)
        expect(methods.map((m) => m.staff)).toEqual(byStaff(rows).map((s) => s.staff))
        expect(methods[0].byMethod).toEqual({ cash: 500, upi: 500, card: 0, bank_transfer: 0, online: 0 })
        expect(unassignedCollections(rows)).toEqual({ txns: 1, amount: 100 })
    })
})

describe('planAnalysis', () => {
    it('adds an average and the comparison period revenue per plan', () => {
        const current = byPlan([row({ plan_name: 'Monthly', amount: 1000 }), row({ plan_name: 'Monthly', amount: 3000 }), row({ plan_name: 'Yearly', amount: 5000 })])
        const previous = byPlan([row({ plan_name: 'Monthly', amount: 2000 })])
        const rows = planAnalysis(current, previous)
        expect(rows.find((r) => r.plan === 'Monthly')).toMatchObject({ avgTicket: 2000, previousRevenue: 2000 })
        expect(rows.find((r) => r.plan === 'Yearly')).toMatchObject({ avgTicket: 5000, previousRevenue: 0 })
        expect(planAnalysis(current, null)[0].previousRevenue).toBeNull()
    })
})

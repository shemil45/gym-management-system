import { describe, it, expect } from 'vitest'
import {
    dayBookTotals, sortForDayBook, summarise, kpis, deltaPercent, byPlan,
    pendingRows, pendingTotals, byStaff, type ReportPaymentRow,
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
        member_name: 'A',
        member_code: 'GYM001',
        member_phone: '9999999999',
        plan_name: 'Monthly',
        processor_name: 'Staff One',
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
        expect(rows[0]).toEqual({ plan: 'Yearly', txns: 1, revenue: 3000, share: 60, avgTicket: 3000 })
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

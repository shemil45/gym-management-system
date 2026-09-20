import { describe, it, expect } from 'vitest'
import { pnlBuckets, pnlTotals, pnlKpis, byCategory, sortLedger, ledgerTotals, marginPercent, expenseRatio, costPerActiveMember, expenseRunRate, type ReportExpenseRow } from '@/lib/reports/expenses-aggregate'
import type { ReportPaymentRow } from '@/lib/reports/payments-aggregate'

function pay(o: Partial<ReportPaymentRow>): ReportPaymentRow {
    return { id: Math.random().toString(36).slice(2), amount: 1000, admission_fee_amount: null, referral_coins_used: 0, payment_method: 'cash', payment_status: 'paid', payment_date: '2026-09-15', created_at: '2026-09-15T04:00:00Z', receipt_number: null, invoice_number: null, notes: null, member_id: 'm1', member_name: 'A', member_code: 'G1', member_phone: null, member_joined: null, plan_name: null, processor_name: null, membership_start_date: null, membership_end_date: null, is_demo: false, ...o }
}
function exp(o: Partial<ReportExpenseRow>): ReportExpenseRow {
    return { id: Math.random().toString(36).slice(2), amount: 300, category: 'rent', description: 'x', expense_date: '2026-09-15', created_at: '2026-09-15T04:00:00Z', receipt_url: null, adder_name: 'S1', is_demo: false, ...o }
}

describe('marginPercent', () => {
    it('is null at zero income, else net/income*100', () => {
        expect(marginPercent(50, 0)).toBeNull()
        expect(marginPercent(250, 1000)).toBe(25)
        expect(marginPercent(-100, 1000)).toBe(-10)
    })
})

describe('pnlBuckets', () => {
    it('nets refunds, splits fees, sums categories, handles income-only and expense-only buckets', () => {
        const buckets = pnlBuckets(
            [pay({ payment_date: '2026-09-13', amount: 1500, admission_fee_amount: 500 }), pay({ payment_date: '2026-09-13', amount: 200, payment_status: 'refunded' }), pay({ payment_date: '2026-09-13', amount: 999, payment_status: 'pending' })],
            [exp({ expense_date: '2026-09-14', amount: 300, category: 'rent' }), exp({ expense_date: '2026-09-14', amount: 100, category: 'utilities' })],
            { from: '2026-09-13', to: '2026-09-15' }, 'day',
        )
        expect(buckets.map((b) => b.start)).toEqual(['2026-09-13', '2026-09-14', '2026-09-15'])
        expect(buckets[0]).toMatchObject({ membershipRevenue: 1000, admissionFees: 500, refunded: 200, netIncome: 1300, totalExpenses: 0, net: 1300, margin: 100 })
        expect(buckets[1]).toMatchObject({ netIncome: 0, totalExpenses: 400, net: -400, margin: null })
        expect(buckets[1].byCategory).toMatchObject({ rent: 300, utilities: 100, salary: 0 })
        expect(buckets[2]).toMatchObject({ netIncome: 0, totalExpenses: 0, net: 0, margin: null })
    })
    it('ignores rows outside the range and buckets by month', () => {
        const buckets = pnlBuckets([pay({ payment_date: '2025-12-31' })], [exp({ expense_date: '2026-02-10' })], { from: '2026-01-01', to: '2026-03-31' }, 'month')
        expect(buckets.map((b) => b.label)).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026'])
        expect(buckets[0].netIncome).toBe(0)
        expect(buckets[1].totalExpenses).toBe(300)
    })
})

describe('pnlTotals / pnlKpis', () => {
    it('totals buckets and recomputes margin from totals', () => {
        const buckets = pnlBuckets([pay({ amount: 1000 })], [exp({ amount: 250 })], { from: '2026-09-15', to: '2026-09-15' }, 'day')
        expect(pnlTotals(buckets)).toMatchObject({ netIncome: 1000, totalExpenses: 250, net: 750, margin: 75 })
        expect(pnlKpis([pay({ amount: 1000 }), pay({ amount: 100, payment_status: 'refunded' })], [exp({ amount: 250 })])).toEqual({ netIncome: 900, totalExpenses: 250, net: 650 })
    })
})

describe('byCategory', () => {
    it('groups, shares, averages, compares with previous, omits empty categories', () => {
        const rows = byCategory(
            [exp({ category: 'rent', amount: 700 }), exp({ category: 'rent', amount: 500 }), exp({ category: 'salary', amount: 800 })],
            [exp({ category: 'rent', amount: 500 }), exp({ category: 'equipment', amount: 50 })],
        )
        expect(rows.map((r) => r.category)).toEqual(['rent', 'salary', 'equipment'])
        expect(rows[0]).toEqual({ category: 'rent', label: 'Rent', entries: 2, total: 1200, share: 60, avg: 600, previous: 500, delta: 140 })
        expect(rows[1].delta).toBeNull()
        expect(rows[2]).toMatchObject({ entries: 0, total: 0, previous: 50, delta: -100 })
    })
})

describe('ledger', () => {
    it('sorts newest first and totals', () => {
        const rows = sortLedger([exp({ id: 'a', expense_date: '2026-09-01' }), exp({ id: 'b', expense_date: '2026-09-10', created_at: '2026-09-10T01:00:00Z' }), exp({ id: 'c', expense_date: '2026-09-10', created_at: '2026-09-10T05:00:00Z' })])
        expect(rows.map((r) => r.id)).toEqual(['c', 'b', 'a'])
        expect(ledgerTotals(rows)).toEqual({ count: 3, amount: 900 })
    })
})

// ═══ Analytics layer ═════════════════════════════════════════════════════════

describe('expenseRatio / costPerActiveMember', () => {
    it('is a percentage of positive net income only', () => {
        expect(expenseRatio(382, 1000)).toBeCloseTo(38.2)
        expect(expenseRatio(100, 0)).toBeNull()
        expect(expenseRatio(100, -50)).toBeNull()
    })
    it('divides by a known, positive member count', () => {
        expect(costPerActiveMember(1000, 40)).toBe(25)
        expect(costPerActiveMember(1000, 0)).toBeNull()
        expect(costPerActiveMember(1000, null)).toBeNull()
    })
})

describe('expenseRunRate', () => {
    const today = '2026-09-20'
    const monthToDate = { from: '2026-09-01', to: today }

    it('projects the current month straight-line from elapsed days', () => {
        const rate = expenseRunRate([exp({ amount: 1000, expense_date: '2026-09-05' }), exp({ amount: 1000, expense_date: '2026-09-15' })], monthToDate, today)
        expect(rate).toEqual({ recorded: 2000, elapsedDays: 20, daysInMonth: 30, projected: 3000 })
    })
    it('is only offered for the current month to date', () => {
        expect(expenseRunRate([exp({ amount: 1 })], { from: '2026-08-01', to: '2026-08-31' }, today)).toBeNull()
        expect(expenseRunRate([exp({ amount: 1 })], { from: '2026-01-01', to: today }, today)).toBeNull()
        expect(expenseRunRate([exp({ amount: 1 })], { from: '2026-09-10', to: today }, today)).toBeNull()
    })
    it('needs at least a week of elapsed days', () => {
        expect(expenseRunRate([exp({ amount: 1 })], { from: '2026-09-01', to: '2026-09-06' }, '2026-09-06')).toBeNull()
        expect(expenseRunRate([exp({ amount: 700, expense_date: '2026-09-01' })], { from: '2026-09-01', to: '2026-09-07' }, '2026-09-07')?.projected).toBe(3000)
    })
    it('has nothing to project on the last day of the month', () => {
        expect(expenseRunRate([exp({ amount: 1 })], { from: '2026-09-01', to: '2026-09-30' }, '2026-09-30')).toBeNull()
    })
    it('ignores rows outside the range', () => {
        expect(expenseRunRate([exp({ amount: 999, expense_date: '2026-08-31' })], monthToDate, today)?.recorded).toBe(0)
    })
})

describe('composition reconciles with the P&L table', () => {
    it('byCategory totals equal pnlTotals byCategory over the same rows', () => {
        const range = { from: '2026-09-01', to: '2026-09-30' }
        const rows = [
            exp({ amount: 300, category: 'rent', expense_date: '2026-09-02' }),
            exp({ amount: 120, category: 'utilities', expense_date: '2026-09-10' }),
            exp({ amount: 80, category: 'utilities', expense_date: '2026-09-25' }),
        ]
        const totals = pnlTotals(pnlBuckets([], rows, range, 'week'))
        const categories = byCategory(rows, [])
        for (const c of categories) expect(c.total).toBe(totals.byCategory[c.category])
        expect(categories.reduce((s, c) => s + c.total, 0)).toBe(totals.totalExpenses)
        expect(expenseRatio(totals.totalExpenses, 1000)).toBe(50)
    })
})

import { addDays, addMonths, format, getDaysInMonth, parseISO } from 'date-fns'
import { bucketLabel, bucketStart, daysBetweenInclusive, rangeForPreset, type Bucket, type DateRange } from '@/lib/reports/dates'
import type { ReportPaymentRow } from '@/lib/reports/payments-aggregate'

export type ExpenseCategory = 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['utilities', 'salary', 'equipment', 'maintenance', 'marketing', 'rent', 'other']
export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    utilities: 'Utilities', salary: 'Salary', equipment: 'Equipment', maintenance: 'Maintenance', marketing: 'Marketing', rent: 'Rent', other: 'Other',
}

export type ReportExpenseRow = {
    id: string
    amount: number
    category: ExpenseCategory
    description: string
    expense_date: string
    created_at: string
    receipt_url: string | null
    adder_name: string | null
    is_demo: boolean
}

export type CategoryTotals = Record<ExpenseCategory, number>

function emptyCategoryTotals(): CategoryTotals {
    return { utilities: 0, salary: 0, equipment: 0, maintenance: 0, marketing: 0, rent: 0, other: 0 }
}

export function marginPercent(net: number, netIncome: number): number | null {
    return netIncome === 0 ? null : (net / netIncome) * 100
}

// ─── P&L ─────────────────────────────────────────────────────────────────────

export type PnlBucket = {
    start: string
    label: string
    membershipRevenue: number
    admissionFees: number
    refunded: number
    netIncome: number
    byCategory: CategoryTotals
    totalExpenses: number
    net: number
    margin: number | null
}

function nextBucketStart(start: string, bucket: Bucket): string {
    const day = parseISO(start)
    const next = bucket === 'day' ? addDays(day, 1) : bucket === 'week' ? addDays(day, 7) : addMonths(day, 1)
    return format(next, 'yyyy-MM-dd')
}

function finalise(bucket: Omit<PnlBucket, 'netIncome' | 'net' | 'margin'>): PnlBucket {
    const netIncome = bucket.membershipRevenue + bucket.admissionFees - bucket.refunded
    const net = netIncome - bucket.totalExpenses
    return { ...bucket, netIncome, net, margin: marginPercent(net, netIncome) }
}

export function pnlBuckets(payments: ReportPaymentRow[], expenses: ReportExpenseRow[], range: DateRange, bucket: Bucket): PnlBucket[] {
    const acc = new Map<string, Omit<PnlBucket, 'netIncome' | 'net' | 'margin'>>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        acc.set(start, { start, label: bucketLabel(start, bucket), membershipRevenue: 0, admissionFees: 0, refunded: 0, byCategory: emptyCategoryTotals(), totalExpenses: 0 })
    }
    for (const row of payments) {
        if (row.payment_date < range.from || row.payment_date > range.to) continue
        const target = acc.get(bucketStart(row.payment_date, bucket))
        if (!target) continue
        if (row.payment_status === 'refunded') { target.refunded += row.amount; continue }
        if (row.payment_status !== 'paid') continue
        const fee = row.admission_fee_amount ?? 0
        target.admissionFees += fee
        target.membershipRevenue += row.amount - fee
    }
    for (const row of expenses) {
        if (row.expense_date < range.from || row.expense_date > range.to) continue
        const target = acc.get(bucketStart(row.expense_date, bucket))
        if (!target) continue
        target.byCategory[row.category] += row.amount
        target.totalExpenses += row.amount
    }
    return [...acc.values()].map(finalise)
}

export function pnlTotals(buckets: PnlBucket[]): Omit<PnlBucket, 'start' | 'label'> {
    const sum = buckets.reduce(
        (t, b) => {
            for (const c of EXPENSE_CATEGORIES) t.byCategory[c] += b.byCategory[c]
            return {
                ...t,
                membershipRevenue: t.membershipRevenue + b.membershipRevenue,
                admissionFees: t.admissionFees + b.admissionFees,
                refunded: t.refunded + b.refunded,
                totalExpenses: t.totalExpenses + b.totalExpenses,
            }
        },
        { membershipRevenue: 0, admissionFees: 0, refunded: 0, byCategory: emptyCategoryTotals(), totalExpenses: 0 },
    )
    const full = finalise({ start: '', label: '', ...sum })
    return {
        membershipRevenue: full.membershipRevenue,
        admissionFees: full.admissionFees,
        refunded: full.refunded,
        netIncome: full.netIncome,
        byCategory: full.byCategory,
        totalExpenses: full.totalExpenses,
        net: full.net,
        margin: full.margin,
    }
}

export type PnlKpis = { netIncome: number; totalExpenses: number; net: number }

export function pnlKpis(payments: ReportPaymentRow[], expenses: ReportExpenseRow[]): PnlKpis {
    const paid = payments.filter((p) => p.payment_status === 'paid').reduce((s, p) => s + p.amount, 0)
    const refunded = payments.filter((p) => p.payment_status === 'refunded').reduce((s, p) => s + p.amount, 0)
    const netIncome = paid - refunded
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    return { netIncome, totalExpenses, net: netIncome - totalExpenses }
}

// ─── By category ─────────────────────────────────────────────────────────────

export type CategoryRow = {
    category: ExpenseCategory
    label: string
    entries: number
    total: number
    share: number
    avg: number
    previous: number
    delta: number | null
}

export function byCategory(current: ReportExpenseRow[], previous: ReportExpenseRow[]): CategoryRow[] {
    const entries = emptyCategoryTotals()
    const totals = emptyCategoryTotals()
    const prev = emptyCategoryTotals()
    for (const row of current) { entries[row.category] += 1; totals[row.category] += row.amount }
    for (const row of previous) prev[row.category] += row.amount
    const grand = EXPENSE_CATEGORIES.reduce((s, c) => s + totals[c], 0)
    return EXPENSE_CATEGORIES
        .filter((c) => entries[c] > 0 || prev[c] > 0)
        .map((c) => ({
            category: c,
            label: CATEGORY_LABELS[c],
            entries: entries[c],
            total: totals[c],
            share: grand ? (totals[c] / grand) * 100 : 0,
            avg: entries[c] ? totals[c] / entries[c] : 0,
            previous: prev[c],
            delta: prev[c] === 0 ? null : ((totals[c] - prev[c]) / prev[c]) * 100,
        }))
        .sort((a, b) => b.total - a.total)
}

// ─── Ledger ──────────────────────────────────────────────────────────────────

export function sortLedger(rows: ReportExpenseRow[]): ReportExpenseRow[] {
    return [...rows].sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at))
}

export function ledgerTotals(rows: ReportExpenseRow[]): { count: number; amount: number } {
    return { count: rows.length, amount: rows.reduce((s, r) => s + r.amount, 0) }
}

// ═══ Analytics layer ═════════════════════════════════════════════════════════
//
// Derived from the same rows the P&L and category tables use. Nothing here
// fetches, and none of it introduces accounting concepts the data cannot
// support: revenue, expenses, net and margin are the whole vocabulary.

/**
 * Total expenses as a share of net income, 0–100. Null when there is no
 * positive revenue to measure against — a ratio over zero or negative income
 * is not a fact worth printing. This is a ratio, not a profitability score.
 */
export function expenseRatio(totalExpenses: number, netIncome: number): number | null {
    return netIncome > 0 ? (totalExpenses / netIncome) * 100 : null
}

/** Total expenses ÷ active members. Null without a member count. */
export function costPerActiveMember(totalExpenses: number, activeMembers: number | null): number | null {
    return activeMembers === null || activeMembers <= 0 ? null : totalExpenses / activeMembers
}

export type RunRate = {
    /** Expenses recorded so far this month. */
    recorded: number
    elapsedDays: number
    daysInMonth: number
    /** recorded ÷ elapsedDays × daysInMonth. A straight-line projection,
     *  nothing more: it assumes the rest of the month spends at the same daily
     *  pace as the days already gone. */
    projected: number
}

/** Fewest elapsed days before a straight-line projection is worth showing. */
export const RUN_RATE_MIN_DAYS = 7

/**
 * A simple month-end projection, offered only when the selected range is the
 * current calendar month to date and at least `RUN_RATE_MIN_DAYS` have
 * elapsed. Any other range — a past month, a custom span, the year — returns
 * null and nothing is shown, rather than projecting something that is not a
 * partial month.
 */
export function expenseRunRate(expenses: ReportExpenseRow[], range: DateRange, today: string): RunRate | null {
    const monthToDate = rangeForPreset('month', today)
    if (range.from !== monthToDate.from || range.to !== monthToDate.to) return null
    const elapsedDays = daysBetweenInclusive(range)
    if (elapsedDays < RUN_RATE_MIN_DAYS) return null
    const daysInMonth = getDaysInMonth(parseISO(today))
    // Nothing to project once the month is complete: recorded is the answer.
    if (elapsedDays >= daysInMonth) return null
    const recorded = expenses
        .filter((row) => row.expense_date >= range.from && row.expense_date <= range.to)
        .reduce((s, row) => s + row.amount, 0)
    return { recorded, elapsedDays, daysInMonth, projected: (recorded / elapsedDays) * daysInMonth }
}

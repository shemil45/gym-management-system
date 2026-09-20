import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonationOwnedIds } from '@/lib/platform/impersonation-ledger'
import type { DateRange } from '@/lib/reports/dates'
import type { ExpensesReportQuery } from '@/lib/reports/expenses-params'
import { fetchPaymentRows } from '@/lib/reports/payments'
import {
    byCategory, costPerActiveMember, expenseRatio, expenseRunRate, ledgerTotals, pnlBuckets, pnlKpis, pnlTotals, sortLedger,
    type CategoryRow, type PnlBucket, type PnlKpis, type ReportExpenseRow, type RunRate,
} from '@/lib/reports/expenses-aggregate'
import type { Comparison } from '@/lib/reports/comparison'
import { countActiveMembers } from '@/lib/reports/member-counts'

const SELECT = 'id, amount, category, description, expense_date, created_at, receipt_url, adder:profiles!expenses_added_by_fkey(full_name)'

type RawRow = {
    id: string
    amount: number | string
    category: ReportExpenseRow['category']
    description: string
    expense_date: string
    created_at: string
    receipt_url: string | null
    adder: { full_name: string } | { full_name: string }[] | null
}

const PAGE_SIZE = 1000

function toNumber(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
    return Number.isFinite(parsed) ? parsed : 0
}

export async function fetchExpenseRows(gymId: string, range: DateRange): Promise<ReportExpenseRow[]> {
    const db = getSupabaseAdmin()
    const fetchPage = (from: number, to: number) =>
        db.from('expenses').select(SELECT).eq('gym_id', gymId)
            .gte('expense_date', range.from).lte('expense_date', range.to)
            .order('expense_date', { ascending: true }).order('created_at', { ascending: true }).order('id', { ascending: true })
            .range(from, to)

    const [firstPage, demoIds] = await Promise.all([fetchPage(0, PAGE_SIZE - 1), getImpersonationOwnedIds(gymId, 'expense')])
    if (firstPage.error) throw new Error(`Expenses report query failed: ${firstPage.error.message}`)
    const raw: RawRow[] = [...((firstPage.data ?? []) as unknown as RawRow[])]
    let page = 1
    let lastSize = raw.length
    while (lastSize === PAGE_SIZE) {
        const result = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (result.error) throw new Error(`Expenses report query failed: ${result.error.message}`)
        const rows = (result.data ?? []) as unknown as RawRow[]
        raw.push(...rows)
        lastSize = rows.length
        page += 1
    }

    return raw.map((row) => {
        const adder = Array.isArray(row.adder) ? row.adder[0] ?? null : row.adder
        return {
            id: row.id,
            amount: toNumber(row.amount),
            category: row.category,
            description: row.description,
            expense_date: row.expense_date,
            created_at: row.created_at,
            receipt_url: row.receipt_url,
            adder_name: adder?.full_name ?? null,
            is_demo: demoIds.has(row.id),
        }
    })
}

/**
 * Everything the P&L tab shows, from the payment and expense rows of the
 * selected range plus, unless comparison is off, the comparison range.
 * `buckets`, `totals`, `kpis` and `previous` are the original fields the table
 * and CSV read; the rest is derived from the same rows. The one extra call
 * is a head-only count of active members for the cost-per-member card.
 */
export type PnlReport = {
    buckets: PnlBucket[]
    totals: ReturnType<typeof pnlTotals>
    kpis: PnlKpis
    previous: PnlKpis | null
    compare: Comparison
    /** Comparison period bucketed the same way, or null with no comparison. */
    comparisonBuckets: PnlBucket[] | null
    /** Expense categories over the same rows: entries, share, average, and the
     *  comparison period's total when there is one. */
    categories: CategoryRow[]
    /** Total expenses ÷ net income, 0–100; null without positive income. */
    expenseRatio: number | null
    previousExpenseRatio: number | null
    /** Live memberships as of today; null when the count was unavailable. */
    activeMembers: number | null
    costPerActiveMember: number | null
    /** Only for the current month to date with enough days elapsed. */
    runRate: RunRate | null
}
export type CategoryReport = { rows: CategoryRow[]; total: number; previousTotal: number | null; compare: Comparison }
export type LedgerReport = { rows: ReportExpenseRow[]; totals: { count: number; amount: number } }

export async function getPnl(gymId: string, query: ExpensesReportQuery, today: string): Promise<PnlReport> {
    const [payments, expenses, prevPayments, prevExpenses, activeMembers] = await Promise.all([
        fetchPaymentRows(gymId, query.range), fetchExpenseRows(gymId, query.range),
        query.previous ? fetchPaymentRows(gymId, query.previous) : Promise.resolve(null),
        query.previous ? fetchExpenseRows(gymId, query.previous) : Promise.resolve(null),
        countActiveMembers(gymId, today),
    ])
    const buckets = pnlBuckets(payments, expenses, query.range, query.bucket)
    const totals = pnlTotals(buckets)
    const kpis = pnlKpis(payments, expenses)
    const previous = prevPayments && prevExpenses ? pnlKpis(prevPayments, prevExpenses) : null
    return {
        buckets,
        totals,
        kpis,
        previous,
        compare: query.compare,
        comparisonBuckets: prevPayments && prevExpenses && query.previous ? pnlBuckets(prevPayments, prevExpenses, query.previous, query.bucket) : null,
        categories: byCategory(expenses, prevExpenses ?? []),
        expenseRatio: expenseRatio(kpis.totalExpenses, kpis.netIncome),
        previousExpenseRatio: previous ? expenseRatio(previous.totalExpenses, previous.netIncome) : null,
        activeMembers,
        costPerActiveMember: costPerActiveMember(kpis.totalExpenses, activeMembers),
        runRate: expenseRunRate(expenses, query.range, today),
    }
}

export async function getByCategory(gymId: string, query: ExpensesReportQuery): Promise<CategoryReport> {
    const [current, previous] = await Promise.all([
        fetchExpenseRows(gymId, query.range),
        query.previous ? fetchExpenseRows(gymId, query.previous) : Promise.resolve(null),
    ])
    const rows = byCategory(current, previous ?? [])
    return {
        rows,
        total: current.reduce((s, r) => s + r.amount, 0),
        previousTotal: previous ? previous.reduce((s, r) => s + r.amount, 0) : null,
        compare: query.compare,
    }
}

export async function getLedger(gymId: string, range: DateRange): Promise<LedgerReport> {
    const rows = sortLedger(await fetchExpenseRows(gymId, range))
    return { rows, totals: ledgerTotals(rows) }
}

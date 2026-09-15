import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonationOwnedIds } from '@/lib/platform/impersonation-ledger'
import type { DateRange } from '@/lib/reports/dates'
import type { ExpensesReportQuery } from '@/lib/reports/expenses-params'
import { fetchPaymentRows } from '@/lib/reports/payments'
import {
    byCategory, ledgerTotals, pnlBuckets, pnlKpis, pnlTotals, sortLedger,
    type CategoryRow, type PnlBucket, type PnlKpis, type ReportExpenseRow,
} from '@/lib/reports/expenses-aggregate'

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

export type PnlReport = { buckets: PnlBucket[]; totals: ReturnType<typeof pnlTotals>; kpis: PnlKpis; previous: PnlKpis }
export type CategoryReport = { rows: CategoryRow[]; total: number; previousTotal: number }
export type LedgerReport = { rows: ReportExpenseRow[]; totals: { count: number; amount: number } }

export async function getPnl(gymId: string, query: ExpensesReportQuery): Promise<PnlReport> {
    const [payments, expenses, prevPayments, prevExpenses] = await Promise.all([
        fetchPaymentRows(gymId, query.range), fetchExpenseRows(gymId, query.range),
        fetchPaymentRows(gymId, query.previous), fetchExpenseRows(gymId, query.previous),
    ])
    const buckets = pnlBuckets(payments, expenses, query.range, query.bucket)
    return { buckets, totals: pnlTotals(buckets), kpis: pnlKpis(payments, expenses), previous: pnlKpis(prevPayments, prevExpenses) }
}

export async function getByCategory(gymId: string, query: ExpensesReportQuery): Promise<CategoryReport> {
    const [current, previous] = await Promise.all([fetchExpenseRows(gymId, query.range), fetchExpenseRows(gymId, query.previous)])
    const rows = byCategory(current, previous)
    return { rows, total: current.reduce((s, r) => s + r.amount, 0), previousTotal: previous.reduce((s, r) => s + r.amount, 0) }
}

export async function getLedger(gymId: string, range: DateRange): Promise<LedgerReport> {
    const rows = sortLedger(await fetchExpenseRows(gymId, range))
    return { rows, totals: ledgerTotals(rows) }
}

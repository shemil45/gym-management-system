import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonationOwnedIds } from '@/lib/platform/impersonation-ledger'
import type { DateRange } from '@/lib/reports/dates'
import type { PaymentsReportQuery } from '@/lib/reports/payments-params'
import {
    byPlan, byStaff, dayBookTotals, kpis, pendingRows, pendingTotals, sortForDayBook, summarise,
    type DayBookTotals, type PlanRow, type ReportPaymentRow, type StaffRow, type SummaryBucket, type SummaryKpis,
} from '@/lib/reports/payments-aggregate'

const SELECT = [
    'id', 'amount', 'admission_fee_amount', 'referral_coins_used', 'payment_method', 'payment_status',
    'payment_date', 'created_at', 'receipt_number', 'invoice_number', 'notes',
    'member:members(full_name, member_id, phone)',
    'membership_plan:membership_plans(name)',
    'processor:profiles!payments_processed_by_fkey(full_name)',
].join(', ')

type RawRow = {
    id: string
    amount: number | string
    admission_fee_amount: number | string | null
    referral_coins_used: number | string | null
    payment_method: ReportPaymentRow['payment_method']
    payment_status: ReportPaymentRow['payment_status']
    payment_date: string
    created_at: string
    receipt_number: string | null
    invoice_number: string | null
    notes: string | null
    member: { full_name: string; member_id: string; phone: string } | { full_name: string; member_id: string; phone: string }[] | null
    membership_plan: { name: string } | { name: string }[] | null
    processor: { full_name: string } | { full_name: string }[] | null
}

function one<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? value[0] ?? null : value
}

function toNumber(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
    return Number.isFinite(parsed) ? parsed : 0
}

const PAGE_SIZE = 1000

async function fetchRows(gymId: string, range: DateRange): Promise<ReportPaymentRow[]> {
    const db = getSupabaseAdmin()

    function fetchPage(from: number, to: number) {
        return db.from('payments').select(SELECT).eq('gym_id', gymId)
            .gte('payment_date', range.from).lte('payment_date', range.to)
            .order('payment_date', { ascending: true }).order('created_at', { ascending: true })
            .range(from, to)
    }

    const [firstPage, demoIds] = await Promise.all([
        fetchPage(0, PAGE_SIZE - 1),
        getImpersonationOwnedIds(gymId, 'payment'),
    ])
    if (firstPage.error) throw new Error(`Payments report query failed: ${firstPage.error.message}`)

    const rows: RawRow[] = [...((firstPage.data ?? []) as unknown as RawRow[])]

    // PostgREST caps a single select at 1,000 rows, so keep paging until a
    // page comes back short of the page size.
    let lastPageSize = rows.length
    let page = 1
    while (lastPageSize === PAGE_SIZE) {
        const result = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (result.error) throw new Error(`Payments report query failed: ${result.error.message}`)
        const data = (result.data ?? []) as unknown as RawRow[]
        rows.push(...data)
        lastPageSize = data.length
        page += 1
    }

    return rows.map((row) => {
        const member = one(row.member)
        return {
            id: row.id,
            amount: toNumber(row.amount),
            admission_fee_amount: row.admission_fee_amount === null ? null : toNumber(row.admission_fee_amount),
            referral_coins_used: toNumber(row.referral_coins_used),
            payment_method: row.payment_method,
            payment_status: row.payment_status,
            payment_date: row.payment_date,
            created_at: row.created_at,
            receipt_number: row.receipt_number,
            invoice_number: row.invoice_number,
            notes: row.notes,
            member_name: member?.full_name ?? null,
            member_code: member?.member_id ?? null,
            member_phone: member?.phone ?? null,
            plan_name: one(row.membership_plan)?.name ?? null,
            processor_name: one(row.processor)?.full_name ?? null,
            is_demo: demoIds.has(row.id),
        }
    })
}

export type DayBookReport = { rows: ReportPaymentRow[]; totals: DayBookTotals }
export type SummaryReport = { buckets: SummaryBucket[]; kpis: SummaryKpis; previous: SummaryKpis }
export type PlanReport = { rows: PlanRow[]; total: { txns: number; revenue: number } }
export type PendingReport = { rows: ReportPaymentRow[]; totals: { count: number; amount: number } }
export type StaffReport = { rows: StaffRow[]; total: { txns: number; collected: number; cash: number } }

export async function getDayBook(gymId: string, date: string): Promise<DayBookReport> {
    const rows = sortForDayBook(await fetchRows(gymId, { from: date, to: date }))
    return { rows, totals: dayBookTotals(rows) }
}

export async function getPeriodSummary(gymId: string, query: PaymentsReportQuery): Promise<SummaryReport> {
    const [current, previous] = await Promise.all([fetchRows(gymId, query.range), fetchRows(gymId, query.previous)])
    return { buckets: summarise(current, query.range, query.bucket), kpis: kpis(current), previous: kpis(previous) }
}

export async function getByPlan(gymId: string, range: DateRange): Promise<PlanReport> {
    const rows = byPlan(await fetchRows(gymId, range))
    return { rows, total: rows.reduce((t, r) => ({ txns: t.txns + r.txns, revenue: t.revenue + r.revenue }), { txns: 0, revenue: 0 }) }
}

export async function getPending(gymId: string, range: DateRange): Promise<PendingReport> {
    const rows = pendingRows(await fetchRows(gymId, range))
    return { rows, totals: pendingTotals(rows) }
}

export async function getByStaff(gymId: string, range: DateRange): Promise<StaffReport> {
    const rows = byStaff(await fetchRows(gymId, range))
    return {
        rows,
        total: rows.reduce(
            (t, r) => ({ txns: t.txns + r.txns, collected: t.collected + r.collected, cash: t.cash + r.cash }),
            { txns: 0, collected: 0, cash: 0 },
        ),
    }
}

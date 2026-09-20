import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonationOwnedIds } from '@/lib/platform/impersonation-ledger'
import { todayInKolkata, type DateRange } from '@/lib/reports/dates'
import type { PaymentsReportQuery } from '@/lib/reports/payments-params'
import {
    ageing, byMethod, byPlan, byStaff, dayBookTotals, kpis, newVsRenewal, payingMembers, pendingRows, pendingTotals,
    planAnalysis, revenueConcentration, sortForDayBook, splitOutstanding, staffMethods, statusKpis, summarise,
    unassignedCollections,
    SELF_SERVICE_LABEL,
    type AgeBucket, type Concentration, type DayBookTotals, type KindRow, type MethodRow, type OutstandingSplit,
    type PayingMembers, type PlanAnalysisRow, type ReportPaymentRow, type StaffMethodRow, type StaffRow,
    type StatusKpis, type SummaryBucket, type SummaryKpis,
} from '@/lib/reports/payments-aggregate'
import type { Comparison } from '@/lib/reports/comparison'

const SELECT = [
    'id', 'amount', 'admission_fee_amount', 'referral_coins_used', 'payment_method', 'payment_status',
    'payment_date', 'created_at', 'receipt_number', 'invoice_number', 'notes',
    'member_id', 'membership_start_date', 'membership_end_date',
    'member:members(full_name, member_id, phone, created_at)',
    'membership_plan:membership_plans(name)',
    'processor:profiles!payments_processed_by_fkey(full_name)',
].join(', ')

type MemberEmbed = { full_name: string; member_id: string; phone: string; created_at: string }

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
    member_id: string
    membership_start_date: string | null
    membership_end_date: string | null
    member: MemberEmbed | MemberEmbed[] | null
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

export async function fetchPaymentRows(gymId: string, range: DateRange): Promise<ReportPaymentRow[]> {
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
            member_id: row.member_id,
            member_name: member?.full_name ?? null,
            member_code: member?.member_id ?? null,
            member_phone: member?.phone ?? null,
            member_joined: member ? todayInKolkata(new Date(member.created_at)) : null,
            plan_name: one(row.membership_plan)?.name ?? null,
            processor_name: one(row.processor)?.full_name
                ?? (row.payment_method === 'online' ? SELF_SERVICE_LABEL : null),
            membership_start_date: row.membership_start_date,
            membership_end_date: row.membership_end_date,
            is_demo: demoIds.has(row.id),
        }
    })
}

export type DayBookReport = { rows: ReportPaymentRow[]; totals: DayBookTotals }

/**
 * Everything the Summary tab shows, all derived from two fetches: the selected
 * range and (unless comparison is off) the comparison range. `buckets`, `kpis`
 * and `previous` are the original fields the table and CSV read; the rest is
 * the analytics layer computed from the very same rows.
 */
export type SummaryReport = {
    buckets: SummaryBucket[]
    kpis: SummaryKpis
    previous: SummaryKpis | null
    compare: Comparison
    /** Comparison period bucketed the same way, or null with no comparison. */
    comparisonBuckets: SummaryBucket[] | null
    status: StatusKpis
    previousStatus: StatusKpis | null
    methods: MethodRow[]
    membership: KindRow[]
    perMember: PayingMembers
    concentration: Concentration | null
}
export type PlanReport = {
    rows: PlanAnalysisRow[]
    total: { txns: number; revenue: number }
    /** Comparison-period totals, or null with no comparison. */
    previousTotal: { txns: number; revenue: number } | null
    compare: Comparison
}
export type PendingReport = {
    /** Pending and failed together, newest first — what the CSV exports. */
    rows: ReportPaymentRow[]
    totals: { count: number; amount: number }
    split: OutstandingSplit
    ageing: AgeBucket[]
    today: string
}
export type StaffReport = {
    rows: StaffRow[]
    total: { txns: number; collected: number; cash: number }
    methods: StaffMethodRow[]
    unassigned: { txns: number; amount: number }
}

export async function getDayBook(gymId: string, date: string): Promise<DayBookReport> {
    const rows = sortForDayBook(await fetchPaymentRows(gymId, { from: date, to: date }))
    return { rows, totals: dayBookTotals(rows) }
}

export async function getPeriodSummary(gymId: string, query: PaymentsReportQuery): Promise<SummaryReport> {
    const [current, comparison] = await Promise.all([
        fetchPaymentRows(gymId, query.range),
        query.previous ? fetchPaymentRows(gymId, query.previous) : Promise.resolve(null),
    ])
    return {
        buckets: summarise(current, query.range, query.bucket),
        kpis: kpis(current),
        previous: comparison ? kpis(comparison) : null,
        compare: query.compare,
        comparisonBuckets: comparison && query.previous ? summarise(comparison, query.previous, query.bucket) : null,
        status: statusKpis(current),
        previousStatus: comparison ? statusKpis(comparison) : null,
        methods: byMethod(current),
        membership: newVsRenewal(current, query.range),
        perMember: payingMembers(current),
        concentration: revenueConcentration(current),
    }
}

const planTotal = (rows: { txns: number; revenue: number }[]) =>
    rows.reduce((t, r) => ({ txns: t.txns + r.txns, revenue: t.revenue + r.revenue }), { txns: 0, revenue: 0 })

export async function getByPlan(gymId: string, query: PaymentsReportQuery): Promise<PlanReport> {
    const [current, comparison] = await Promise.all([
        fetchPaymentRows(gymId, query.range),
        query.previous ? fetchPaymentRows(gymId, query.previous) : Promise.resolve(null),
    ])
    const rows = byPlan(current)
    const previousRows = comparison ? byPlan(comparison) : null
    return {
        rows: planAnalysis(rows, previousRows),
        total: planTotal(rows),
        previousTotal: previousRows ? planTotal(previousRows) : null,
        compare: query.compare,
    }
}

export async function getPending(gymId: string, range: DateRange, today: string): Promise<PendingReport> {
    const all = await fetchPaymentRows(gymId, range)
    const rows = pendingRows(all)
    return { rows, totals: pendingTotals(rows), split: splitOutstanding(all), ageing: ageing(all, today), today }
}

export async function getByStaff(gymId: string, range: DateRange): Promise<StaffReport> {
    const all = await fetchPaymentRows(gymId, range)
    const rows = byStaff(all)
    return {
        rows,
        total: rows.reduce(
            (t, r) => ({ txns: t.txns + r.txns, collected: t.collected + r.collected, cash: t.cash + r.cash }),
            { txns: 0, collected: 0, cash: 0 },
        ),
        methods: staffMethods(all),
        unassigned: unassignedCollections(all),
    }
}

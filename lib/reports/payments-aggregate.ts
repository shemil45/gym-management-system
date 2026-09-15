import { addDays, addMonths, parseISO, format } from 'date-fns'
import { bucketLabel, bucketStart, type Bucket, type DateRange } from '@/lib/reports/dates'

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded'

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank_transfer', 'online']
export const METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank transfer', online: 'Online',
}

/** One payment as fetched for reports. Joins are flattened to plain strings. */
export type ReportPaymentRow = {
    id: string
    amount: number
    admission_fee_amount: number | null
    referral_coins_used: number
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    payment_date: string
    created_at: string
    receipt_number: string | null
    invoice_number: string | null
    notes: string | null
    member_name: string | null
    member_code: string | null
    member_phone: string | null
    plan_name: string | null
    processor_name: string | null
    is_demo: boolean
}

export type MethodTotals = Record<PaymentMethod, number>

function emptyMethodTotals(): MethodTotals {
    return { cash: 0, upi: 0, card: 0, bank_transfer: 0, online: 0 }
}

const isPaid = (row: ReportPaymentRow) => row.payment_status === 'paid'
const sum = (rows: ReportPaymentRow[], pick: (row: ReportPaymentRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0)

// ─── Day book ────────────────────────────────────────────────────────────────

export type DayBookTotals = {
    collected: number
    paidCount: number
    byMethod: MethodTotals
    pendingCount: number
    pendingAmount: number
    refundedCount: number
    refundedAmount: number
}

export function dayBookTotals(rows: ReportPaymentRow[]): DayBookTotals {
    const paid = rows.filter(isPaid)
    const pending = rows.filter((row) => row.payment_status === 'pending' || row.payment_status === 'failed')
    const refunded = rows.filter((row) => row.payment_status === 'refunded')
    const byMethod = emptyMethodTotals()
    for (const row of paid) byMethod[row.payment_method] += row.amount
    return {
        collected: sum(paid, (row) => row.amount),
        paidCount: paid.length,
        byMethod,
        pendingCount: pending.length,
        pendingAmount: sum(pending, (row) => row.amount),
        refundedCount: refunded.length,
        refundedAmount: sum(refunded, (row) => row.amount),
    }
}

export function sortForDayBook(rows: ReportPaymentRow[]): ReportPaymentRow[] {
    return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export type SummaryBucket = {
    start: string
    label: string
    txns: number
    collected: number
    byMethod: MethodTotals
    admissionFees: number
    membershipRevenue: number
    coinsRedeemed: number
    refunded: number
}

function nextBucketStart(start: string, bucket: Bucket): string {
    const day = parseISO(start)
    const next = bucket === 'day' ? addDays(day, 1) : bucket === 'week' ? addDays(day, 7) : addMonths(day, 1)
    return format(next, 'yyyy-MM-dd')
}

export function summarise(rows: ReportPaymentRow[], range: DateRange, bucket: Bucket): SummaryBucket[] {
    const buckets = new Map<string, SummaryBucket>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        buckets.set(start, {
            start, label: bucketLabel(start, bucket), txns: 0, collected: 0, byMethod: emptyMethodTotals(),
            admissionFees: 0, membershipRevenue: 0, coinsRedeemed: 0, refunded: 0,
        })
    }
    for (const row of rows) {
        const target = buckets.get(bucketStart(row.payment_date, bucket))
        if (!target) continue
        if (row.payment_status === 'refunded') {
            target.refunded += row.amount
            continue
        }
        if (!isPaid(row)) continue
        const fee = row.admission_fee_amount ?? 0
        target.txns += 1
        target.collected += row.amount
        target.byMethod[row.payment_method] += row.amount
        target.admissionFees += fee
        target.membershipRevenue += row.amount - fee
        target.coinsRedeemed += row.referral_coins_used
    }
    return [...buckets.values()]
}

export type SummaryKpis = { collected: number; txns: number; avgTicket: number }

export function kpis(rows: ReportPaymentRow[]): SummaryKpis {
    const paid = rows.filter(isPaid)
    const collected = sum(paid, (row) => row.amount)
    return { collected, txns: paid.length, avgTicket: paid.length ? collected / paid.length : 0 }
}

export function deltaPercent(current: number, previous: number): number | null {
    if (previous === 0) return null
    return ((current - previous) / previous) * 100
}

// ─── By plan ─────────────────────────────────────────────────────────────────

export type PlanRow = { plan: string; txns: number; revenue: number; share: number; avgTicket: number }

export function byPlan(rows: ReportPaymentRow[]): PlanRow[] {
    const paid = rows.filter(isPaid)
    const total = sum(paid, (row) => row.amount)
    const groups = new Map<string, { txns: number; revenue: number }>()
    for (const row of paid) {
        const key = row.plan_name ?? 'No plan'
        const group = groups.get(key) ?? { txns: 0, revenue: 0 }
        group.txns += 1
        group.revenue += row.amount
        groups.set(key, group)
    }
    return [...groups.entries()]
        .map(([plan, group]) => ({
            plan, txns: group.txns, revenue: group.revenue,
            share: total ? (group.revenue / total) * 100 : 0,
            avgTicket: group.revenue / group.txns,
        }))
        .sort((a, b) => b.revenue - a.revenue)
}

// ─── Pending ─────────────────────────────────────────────────────────────────

export function pendingRows(rows: ReportPaymentRow[]): ReportPaymentRow[] {
    return rows
        .filter((row) => row.payment_status === 'pending' || row.payment_status === 'failed')
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at))
}

export function pendingTotals(rows: ReportPaymentRow[]): { count: number; amount: number } {
    return { count: rows.length, amount: sum(rows, (row) => row.amount) }
}

// ─── By staff ────────────────────────────────────────────────────────────────

export type StaffRow = { staff: string; txns: number; collected: number; cash: number }

export function byStaff(rows: ReportPaymentRow[]): StaffRow[] {
    const groups = new Map<string, StaffRow>()
    for (const row of rows.filter(isPaid)) {
        const key = row.processor_name ?? 'Unassigned'
        const group = groups.get(key) ?? { staff: key, txns: 0, collected: 0, cash: 0 }
        group.txns += 1
        group.collected += row.amount
        if (row.payment_method === 'cash') group.cash += row.amount
        groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => b.collected - a.collected)
}

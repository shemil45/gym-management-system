import { addDays, addMonths, parseISO, format } from 'date-fns'
import { bucketLabel, bucketStart, daysBetweenInclusive, todayInKolkata, type Bucket, type DateRange } from '@/lib/reports/dates'

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded'

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank_transfer', 'online']
export const METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank transfer', online: 'Online',
}

/**
 * Shown as `processor_name` when a payment has no `processed_by` and was
 * paid via the member portal's self-checkout ('online'), so reports can
 * tell "member paid themselves" apart from a staff-recorded payment that's
 * simply missing its collector.
 */
export const SELF_SERVICE_LABEL = 'Member (self)'

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
    member_id: string
    member_name: string | null
    member_code: string | null
    member_phone: string | null
    /** IST calendar date the member record was created — the join date, as the members report defines it. */
    member_joined: string | null
    plan_name: string | null
    processor_name: string | null
    membership_start_date: string | null
    membership_end_date: string | null
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
    return ((current - previous) / Math.abs(previous)) * 100
}

// ─── By plan ─────────────────────────────────────────────────────────────────

export type PlanRow = { plan: string; txns: number; revenue: number; share: number }

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

// ═══ Analytics layer ═════════════════════════════════════════════════════════
//
// Everything below derives from the same `ReportPaymentRow[]` the tables use,
// so a chart and the table beside it always reconcile. Nothing here fetches.

// ─── Status KPIs ─────────────────────────────────────────────────────────────

export type StatusKpis = {
    /** Rows that were an attempt to pay: paid + pending + failed. A refund
     *  reverses a payment that succeeded, so it is not an attempt. */
    attempts: number
    successful: number
    /** successful / attempts, or null with no attempts. */
    successRate: number | null
    failed: number
    failedAmount: number
    pending: number
    pendingAmount: number
    refunded: number
    refundedAmount: number
}

export function statusKpis(rows: ReportPaymentRow[]): StatusKpis {
    const paid = rows.filter(isPaid)
    const failed = rows.filter((row) => row.payment_status === 'failed')
    const pending = rows.filter((row) => row.payment_status === 'pending')
    const refunded = rows.filter((row) => row.payment_status === 'refunded')
    const attempts = paid.length + failed.length + pending.length
    return {
        attempts,
        successful: paid.length,
        successRate: attempts ? (paid.length / attempts) * 100 : null,
        failed: failed.length,
        failedAmount: sum(failed, (row) => row.amount),
        pending: pending.length,
        pendingAmount: sum(pending, (row) => row.amount),
        refunded: refunded.length,
        refundedAmount: sum(refunded, (row) => row.amount),
    }
}

// ─── Payment methods ─────────────────────────────────────────────────────────

export type MethodRow = { method: PaymentMethod; label: string; txns: number; amount: number; share: number }

/** Paid rows by method, every method present, largest first. Amounts equal
 *  the Summary table's per-method totals. */
export function byMethod(rows: ReportPaymentRow[]): MethodRow[] {
    const paid = rows.filter(isPaid)
    const total = sum(paid, (row) => row.amount)
    const txns: Record<PaymentMethod, number> = { cash: 0, upi: 0, card: 0, bank_transfer: 0, online: 0 }
    const amount = emptyMethodTotals()
    for (const row of paid) {
        txns[row.payment_method] += 1
        amount[row.payment_method] += row.amount
    }
    return PAYMENT_METHODS
        .map((method) => ({
            method, label: METHOD_LABELS[method], txns: txns[method], amount: amount[method],
            share: total ? (amount[method] / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
}

// ─── New vs renewal ──────────────────────────────────────────────────────────

export type MembershipKind = 'new' | 'renewal' | 'unclassified'

export const KIND_LABELS: Record<MembershipKind, string> = {
    new: 'New memberships',
    renewal: 'Renewals',
    unclassified: 'Unclassified',
}

export type KindRow = { kind: MembershipKind; label: string; txns: number; amount: number; share: number }

/**
 * Classifies each paid payment in the period as a new membership or a
 * renewal, using only the rows already fetched plus the member's join date
 * (`members.created_at`, which the Members report also treats as the join
 * date). The rule, applied in order:
 *
 *   1. No `membership_start_date` on the payment, or no member on record
 *      → **unclassified**. The payment did not start a membership window,
 *      so it is neither. Shown as its own row rather than folded into either
 *      side.
 *   2. The same member has an earlier paid membership payment *within the
 *      fetched rows* → **renewal**. Certain.
 *   3. Otherwise, the member joined on or after the start of the selected
 *      range → **new**. Their first membership payment falls inside a period
 *      that also contains their join date.
 *   4. Otherwise → **renewal**. The member existed before this period and has
 *      no earlier payment inside it, so their previous membership was bought
 *      before the range began.
 *
 * Step 4 is the one assumption: a member created long before their first
 * ever payment (a record set up in advance, or an imported roster) will be
 * counted as renewing. Resolving that needs the member's full payment history,
 * which this report does not fetch. Amounts sum to the period's Collected
 * total, so the split reconciles with every other view.
 */
export function classifyMembership(row: ReportPaymentRow, rows: ReportPaymentRow[], range: DateRange): MembershipKind {
    if (!isPaid(row)) return 'unclassified'
    if (row.membership_start_date === null || row.member_joined === null) return 'unclassified'
    const earlier = rows.some((other) =>
        other !== row
        && isPaid(other)
        && other.member_id === row.member_id
        && other.membership_start_date !== null
        && (other.payment_date < row.payment_date
            || (other.payment_date === row.payment_date && other.created_at < row.created_at)),
    )
    if (earlier) return 'renewal'
    return row.member_joined >= range.from ? 'new' : 'renewal'
}

export function newVsRenewal(rows: ReportPaymentRow[], range: DateRange): KindRow[] {
    const paid = rows.filter(isPaid)
    const total = sum(paid, (row) => row.amount)
    const acc: Record<MembershipKind, { txns: number; amount: number }> = {
        new: { txns: 0, amount: 0 }, renewal: { txns: 0, amount: 0 }, unclassified: { txns: 0, amount: 0 },
    }
    for (const row of paid) {
        const kind = classifyMembership(row, rows, range)
        acc[kind].txns += 1
        acc[kind].amount += row.amount
    }
    return (['new', 'renewal', 'unclassified'] as MembershipKind[]).map((kind) => ({
        kind, label: KIND_LABELS[kind], txns: acc[kind].txns, amount: acc[kind].amount,
        share: total ? (acc[kind].amount / total) * 100 : 0,
    }))
}

// ─── Per member ──────────────────────────────────────────────────────────────

export type PayingMembers = {
    /** Distinct members with at least one paid row in the period. */
    members: number
    /** Collected ÷ members. Labelled "revenue per paying member" — it is not
     *  ARPU, which would divide by every active member, paying or not. */
    revenuePerMember: number
}

export function payingMembers(rows: ReportPaymentRow[]): PayingMembers {
    const paid = rows.filter(isPaid)
    const members = new Set(paid.map((row) => row.member_id)).size
    const collected = sum(paid, (row) => row.amount)
    return { members, revenuePerMember: members ? collected / members : 0 }
}

export type Concentration = {
    /** Fraction of paying members counted as the top group, e.g. 0.1. */
    topFraction: number
    topMembers: number
    members: number
    /** Share of collected revenue those members account for, 0–100. */
    revenueShare: number
}

/**
 * How much of the period's revenue came from the top slice of paying members.
 * Null below ten paying members: "top 10%" of six people is one person, which
 * says nothing about concentration. Members are never named.
 */
export function revenueConcentration(rows: ReportPaymentRow[], topFraction = 0.1): Concentration | null {
    const perMember = new Map<string, number>()
    for (const row of rows.filter(isPaid)) perMember.set(row.member_id, (perMember.get(row.member_id) ?? 0) + row.amount)
    const members = perMember.size
    if (members < 10) return null
    const totals = [...perMember.values()].sort((a, b) => b - a)
    const total = totals.reduce((s, v) => s + v, 0)
    const topMembers = Math.max(1, Math.ceil(members * topFraction))
    const top = totals.slice(0, topMembers).reduce((s, v) => s + v, 0)
    return { topFraction, topMembers, members, revenueShare: total ? (top / total) * 100 : 0 }
}

// ─── Outstanding: pending vs failed, and ageing ──────────────────────────────

export type OutstandingSplit = { pending: ReportPaymentRow[]; failed: ReportPaymentRow[] }

/** The same rows `pendingRows` returns, separated by status. Sorted newest first. */
export function splitOutstanding(rows: ReportPaymentRow[]): OutstandingSplit {
    const outstanding = pendingRows(rows)
    return {
        pending: outstanding.filter((row) => row.payment_status === 'pending'),
        failed: outstanding.filter((row) => row.payment_status === 'failed'),
    }
}

/**
 * Whole days since the payment was recorded, in IST. Uses `created_at` — when
 * the row entered the system — rather than `payment_date`, which is the date
 * the payment was *for* and can be set by hand.
 */
export function ageInDays(row: ReportPaymentRow, today: string): number {
    const recorded = todayInKolkata(new Date(row.created_at))
    return Math.max(0, daysBetweenInclusive({ from: recorded, to: today }) - 1)
}

export type AgeBucketId = 'today' | '1-3' | '4-7' | '8+'

export const AGE_BUCKETS: { id: AgeBucketId; label: string; min: number; max: number }[] = [
    { id: 'today', label: 'Today', min: 0, max: 0 },
    { id: '1-3', label: '1–3 days', min: 1, max: 3 },
    { id: '4-7', label: '4–7 days', min: 4, max: 7 },
    { id: '8+', label: 'Over 7 days', min: 8, max: Number.POSITIVE_INFINITY },
]

export type AgeBucket = {
    id: AgeBucketId
    label: string
    pendingCount: number
    pendingAmount: number
    failedCount: number
    failedAmount: number
}

/** Outstanding (pending + failed) rows by age since they were recorded. */
export function ageing(rows: ReportPaymentRow[], today: string): AgeBucket[] {
    const buckets: AgeBucket[] = AGE_BUCKETS.map((b) => ({ id: b.id, label: b.label, pendingCount: 0, pendingAmount: 0, failedCount: 0, failedAmount: 0 }))
    for (const row of pendingRows(rows)) {
        const age = ageInDays(row, today)
        const index = AGE_BUCKETS.findIndex((b) => age >= b.min && age <= b.max)
        const target = buckets[index === -1 ? buckets.length - 1 : index]
        if (row.payment_status === 'failed') { target.failedCount += 1; target.failedAmount += row.amount }
        else { target.pendingCount += 1; target.pendingAmount += row.amount }
    }
    return buckets
}

// ─── Staff analytics ─────────────────────────────────────────────────────────

export type StaffMethodRow = { staff: string; collected: number; byMethod: MethodTotals }

/** Per-collector method split. Same grouping and order as `byStaff`, so the
 *  two line up row for row. */
export function staffMethods(rows: ReportPaymentRow[]): StaffMethodRow[] {
    const groups = new Map<string, StaffMethodRow>()
    for (const row of rows.filter(isPaid)) {
        const key = row.processor_name ?? 'Unassigned'
        const group = groups.get(key) ?? { staff: key, collected: 0, byMethod: emptyMethodTotals() }
        group.collected += row.amount
        group.byMethod[row.payment_method] += row.amount
        groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => b.collected - a.collected)
}

/** Paid rows with no recorded collector — a data-quality figure, not a person. */
export function unassignedCollections(rows: ReportPaymentRow[]): { txns: number; amount: number } {
    const unassigned = rows.filter((row) => isPaid(row) && row.processor_name === null)
    return { txns: unassigned.length, amount: sum(unassigned, (row) => row.amount) }
}

// ─── Plan analytics ──────────────────────────────────────────────────────────

export type PlanAnalysisRow = PlanRow & {
    avgTicket: number
    /** Revenue for the same plan in the comparison period; null with no comparison. */
    previousRevenue: number | null
}

/** `byPlan` rows with an average ticket and, when a comparison period was
 *  fetched, that period's revenue per plan. Plans that only appear in the
 *  comparison period are not added — the table is about this period. */
export function planAnalysis(current: PlanRow[], previous: PlanRow[] | null): PlanAnalysisRow[] {
    const prev = new Map((previous ?? []).map((row) => [row.plan, row.revenue]))
    return current.map((row) => ({
        ...row,
        avgTicket: row.txns ? row.revenue / row.txns : 0,
        previousRevenue: previous === null ? null : prev.get(row.plan) ?? 0,
    }))
}

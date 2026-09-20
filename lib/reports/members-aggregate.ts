import { addDays, addMonths, format, parseISO } from 'date-fns'
import { addDaysIso, bucketLabel, bucketStart, daysBetweenInclusive, todayInKolkata, type Bucket, type DateRange } from '@/lib/reports/dates'

export type EffectiveStatus = 'active' | 'expiring' | 'expired' | 'frozen' | 'inactive'

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
    active: 'Active',
    expiring: 'Expiring soon',
    expired: 'Expired',
    frozen: 'Frozen',
    inactive: 'Inactive',
}

export type ReportMemberRow = {
    id: string
    member_code: string
    full_name: string
    phone: string
    status: 'active' | 'inactive' | 'frozen' | 'expired'
    plan_id: string | null
    plan_name: string | null
    plan_price: number
    plan_duration_days: number
    membership_start_date: string | null
    membership_expiry_date: string | null
    referred_by: string | null
    referrer_name: string | null
    referral_coins_balance: number
    created_at: string
    is_demo: boolean
}

export type MembershipWindow = {
    member_id: string
    start: string
    end: string
    amount: number
    payment_date: string
    plan_name: string | null
}

/** From ReportPaymentRow (paid only). */
export type PaymentStub = {
    member_id: string
    amount: number
    payment_date: string
    membership_start_date: string | null
    membership_end_date: string | null
    plan_name: string | null
}

/** Calendar date in Asia/Kolkata of a timestamp. */
export function istDate(iso: string): string {
    return todayInKolkata(new Date(iso))
}

/** Earliest date the "all history" payment fetch reaches back to. */
export const HISTORY_START = '2000-01-01'

/**
 * The window fetch is all history up to today — not the selected range —
 * because renewals can be paid after the selected period, and capping the
 * fetch at `range.to` would miss them and inflate churn/lapsed counts.
 */
export function historyRange(today: string): DateRange {
    return { from: HISTORY_START, to: today }
}

function nextBucketStart(start: string, bucket: Bucket): string {
    const day = parseISO(start)
    const next = bucket === 'day' ? addDays(day, 1) : bucket === 'week' ? addDays(day, 7) : addMonths(day, 1)
    return format(next, 'yyyy-MM-dd')
}

// ─── Effective status ────────────────────────────────────────────────────────

export function effectiveStatus(m: Pick<ReportMemberRow, 'status' | 'membership_expiry_date'>, today: string): EffectiveStatus {
    if (m.status === 'frozen') return 'frozen'
    if (m.status === 'inactive') return 'inactive'
    if (!m.membership_expiry_date || m.membership_expiry_date < today) return 'expired'
    if (m.membership_expiry_date <= addDaysIso(today, 7)) return 'expiring'
    return 'active'
}

// ─── Membership windows ──────────────────────────────────────────────────────

export function windowsFrom(payments: PaymentStub[]): MembershipWindow[] {
    return payments
        .filter((p): p is PaymentStub & { membership_start_date: string; membership_end_date: string } =>
            p.membership_start_date !== null && p.membership_end_date !== null,
        )
        .map((p) => ({
            member_id: p.member_id,
            start: p.membership_start_date,
            end: p.membership_end_date,
            amount: p.amount,
            payment_date: p.payment_date,
            plan_name: p.plan_name,
        }))
        .sort((a, b) => a.start.localeCompare(b.start))
}

export function isRenewed(window: MembershipWindow, all: MembershipWindow[]): boolean {
    const limit = addDaysIso(window.end, 30)
    return all.some(
        (w) => w.member_id === window.member_id && w !== window && w.start > window.start && w.start <= limit,
    )
}

export function latestPayment(payments: PaymentStub[], memberId: string): PaymentStub | null {
    const rows = payments.filter((p) => p.member_id === memberId)
    if (rows.length === 0) return null
    return rows.reduce((latest, row) => (row.payment_date > latest.payment_date ? row : latest))
}

export function firstPayment(payments: PaymentStub[], memberId: string): PaymentStub | null {
    const rows = payments.filter((p) => p.member_id === memberId)
    if (rows.length === 0) return null
    return rows.reduce((earliest, row) => (row.payment_date < earliest.payment_date ? row : earliest))
}

// ─── Joins ───────────────────────────────────────────────────────────────────

export type JoinRow = {
    member: ReportMemberRow
    joinDate: string
    source: 'referral' | 'walk-in'
    firstPayment: PaymentStub | null
}

export function joins(members: ReportMemberRow[], payments: PaymentStub[], range: DateRange): JoinRow[] {
    return members
        .map((member) => ({ member, joinDate: istDate(member.created_at) }))
        .filter(({ joinDate }) => joinDate >= range.from && joinDate <= range.to)
        .map(({ member, joinDate }) => ({
            member,
            joinDate,
            source: member.referred_by ? ('referral' as const) : ('walk-in' as const),
            firstPayment: firstPayment(payments, member.id),
        }))
        .sort((a, b) => b.joinDate.localeCompare(a.joinDate) || b.member.created_at.localeCompare(a.member.created_at))
}

export type JoinKpis = { joins: number; referralShare: number }

export function joinKpis(rows: JoinRow[]): JoinKpis {
    const total = rows.length
    const referrals = rows.filter((r) => r.source === 'referral').length
    return { joins: total, referralShare: total ? (referrals / total) * 100 : 0 }
}

// ─── Renewals due ────────────────────────────────────────────────────────────

export type RenewalRow = { member: ReportMemberRow; expiry: string; daysLeft: number; lastPayment: PaymentStub | null }

export function renewalsDue(members: ReportMemberRow[], payments: PaymentStub[], today: string, horizon: number): RenewalRow[] {
    const limit = addDaysIso(today, horizon)
    return members
        .filter((m) => {
            const status = effectiveStatus(m, today)
            if (status !== 'active' && status !== 'expiring') return false
            const expiry = m.membership_expiry_date
            return !!expiry && expiry >= today && expiry <= limit
        })
        .map((member) => {
            const expiry = member.membership_expiry_date as string
            return {
                member,
                expiry,
                daysLeft: daysBetweenInclusive({ from: today, to: expiry }) - 1,
                lastPayment: latestPayment(payments, member.id),
            }
        })
        .sort((a, b) => a.expiry.localeCompare(b.expiry))
}

// ─── Lapsed ──────────────────────────────────────────────────────────────────

export type LapsedRow = { member: ReportMemberRow; endedOn: string; overdueDays: number; lastPayment: PaymentStub | null }

function latestUnrenewedByMember(windows: MembershipWindow[], all: MembershipWindow[], range: DateRange): Map<string, MembershipWindow> {
    const candidates = windows.filter((w) => w.end >= range.from && w.end <= range.to && !isRenewed(w, all))
    const latest = new Map<string, MembershipWindow>()
    for (const w of candidates) {
        const current = latest.get(w.member_id)
        if (!current || w.end > current.end) latest.set(w.member_id, w)
    }
    return latest
}

export function lapsed(
    members: ReportMemberRow[],
    windows: MembershipWindow[],
    payments: PaymentStub[],
    range: DateRange,
    today: string,
): LapsedRow[] {
    const byId = new Map(members.map((m) => [m.id, m]))
    const latest = latestUnrenewedByMember(windows, windows, range)
    const rows: LapsedRow[] = []
    for (const [memberId, window] of latest) {
        const member = byId.get(memberId)
        if (!member) continue
        if (member.membership_expiry_date && member.membership_expiry_date >= today) continue
        rows.push({
            member,
            endedOn: window.end,
            overdueDays: daysBetweenInclusive({ from: window.end, to: today }) - 1,
            lastPayment: latestPayment(payments, memberId),
        })
    }
    return rows.sort((a, b) => b.endedOn.localeCompare(a.endedOn))
}

// ─── Retention ───────────────────────────────────────────────────────────────

export type RetentionBucket = { start: string; label: string; ended: number; renewed: number; retention: number | null; churned: number }

export function retentionBuckets(windows: MembershipWindow[], range: DateRange, bucket: Bucket): RetentionBucket[] {
    const acc = new Map<string, { ended: number; renewed: number }>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        acc.set(start, { ended: 0, renewed: 0 })
    }
    for (const window of windows) {
        if (window.end < range.from || window.end > range.to) continue
        const target = acc.get(bucketStart(window.end, bucket))
        if (!target) continue
        target.ended += 1
        if (isRenewed(window, windows)) target.renewed += 1
    }
    return [...acc.entries()].map(([start, { ended, renewed }]) => ({
        start,
        label: bucketLabel(start, bucket),
        ended,
        renewed,
        retention: ended ? (renewed / ended) * 100 : null,
        churned: ended - renewed,
    }))
}

export function retentionTotals(buckets: RetentionBucket[]): Omit<RetentionBucket, 'start' | 'label'> {
    const ended = buckets.reduce((s, b) => s + b.ended, 0)
    const renewed = buckets.reduce((s, b) => s + b.renewed, 0)
    return { ended, renewed, retention: ended ? (renewed / ended) * 100 : null, churned: ended - renewed }
}

// ─── Churned ─────────────────────────────────────────────────────────────────

export function churned(members: ReportMemberRow[], windows: MembershipWindow[], payments: PaymentStub[], range: DateRange): LapsedRow[] {
    const byId = new Map(members.map((m) => [m.id, m]))
    const latest = latestUnrenewedByMember(windows, windows, range)
    const rows: LapsedRow[] = []
    for (const [memberId, window] of latest) {
        const member = byId.get(memberId)
        if (!member) continue
        rows.push({
            member,
            endedOn: window.end,
            overdueDays: daysBetweenInclusive({ from: window.end, to: range.to }) - 1,
            lastPayment: latestPayment(payments, memberId),
        })
    }
    return rows.sort((a, b) => b.endedOn.localeCompare(a.endedOn))
}

// ─── Roster ──────────────────────────────────────────────────────────────────

export type RosterCounts = Record<EffectiveStatus, number> & { total: number }

export function rosterCounts(members: ReportMemberRow[], today: string): RosterCounts {
    const counts: RosterCounts = { active: 0, expiring: 0, expired: 0, frozen: 0, inactive: 0, total: 0 }
    for (const member of members) {
        counts[effectiveStatus(member, today)] += 1
        counts.total += 1
    }
    return counts
}

// ─── Plan distribution ───────────────────────────────────────────────────────

export type PlanRow = { plan: string; members: number; share: number; price: number; durationDays: number; monthlyValue: number }

export function planDistribution(members: ReportMemberRow[], today: string): PlanRow[] {
    const eligible = members.filter((m) => {
        const status = effectiveStatus(m, today)
        return status === 'active' || status === 'expiring'
    })
    const total = eligible.length
    const groups = new Map<string, { plan: string; members: number; price: number; durationDays: number }>()
    for (const member of eligible) {
        const key = member.plan_id ?? 'no-plan'
        const group = groups.get(key) ?? {
            plan: member.plan_name ?? 'No plan',
            members: 0,
            price: member.plan_price,
            durationDays: member.plan_duration_days,
        }
        group.members += 1
        groups.set(key, group)
    }
    return [...groups.values()]
        .map((group) => ({
            plan: group.plan,
            members: group.members,
            share: total ? (group.members / total) * 100 : 0,
            price: group.price,
            durationDays: group.durationDays,
            monthlyValue: group.durationDays ? (group.price * 30) / group.durationDays : 0,
        }))
        .sort((a, b) => b.members - a.members)
}

// ─── Inactive ────────────────────────────────────────────────────────────────

export type InactiveRow = { member: ReportMemberRow; lastVisit: string | null; daysSince: number | null; expiry: string | null }

export function inactive(members: ReportMemberRow[], lastVisits: Map<string, string>, today: string, days: number): InactiveRow[] {
    const cutoff = addDaysIso(today, -(days - 1))
    return members
        .filter((m) => {
            const status = effectiveStatus(m, today)
            return status === 'active' || status === 'expiring'
        })
        .map((member) => {
            const lastVisit = lastVisits.get(member.id) ?? null
            return { member, lastVisit, expiry: member.membership_expiry_date }
        })
        .filter(({ lastVisit }) => lastVisit === null || lastVisit < cutoff)
        .map(({ member, lastVisit, expiry }) => ({
            member,
            lastVisit,
            daysSince: lastVisit === null ? null : daysBetweenInclusive({ from: lastVisit, to: today }) - 1,
            expiry,
        }))
        .sort((a, b) => {
            if (a.lastVisit === null && b.lastVisit === null) return 0
            if (a.lastVisit === null) return -1
            if (b.lastVisit === null) return 1
            return a.lastVisit.localeCompare(b.lastVisit)
        })
}

// ═══ Analytics layer ═════════════════════════════════════════════════════════
//
// Everything below is computed from the rows the tabs already fetch — the
// member roster, the paid-payment stubs, and (for Inactive) recent check-ins.
// Nothing here fetches, and nothing needs data the report does not hold.

// ─── Joins: growth ───────────────────────────────────────────────────────────

export type JoinSummary = {
    joins: number
    referral: number
    walkIn: number
    referralShare: number
    /** Members whose first payment is known; the average is over these only. */
    withFirstPayment: number
    /** Null when no join in the period has a first payment. */
    avgFirstPayment: number | null
}

export function joinSummary(rows: JoinRow[]): JoinSummary {
    const referral = rows.filter((r) => r.source === 'referral').length
    const paid = rows.filter((r): r is JoinRow & { firstPayment: PaymentStub } => r.firstPayment !== null)
    return {
        joins: rows.length,
        referral,
        walkIn: rows.length - referral,
        referralShare: rows.length ? (referral / rows.length) * 100 : 0,
        withFirstPayment: paid.length,
        avgFirstPayment: paid.length ? paid.reduce((s, r) => s + r.firstPayment.amount, 0) / paid.length : null,
    }
}

export type JoinBucket = {
    start: string
    label: string
    joins: number
    referral: number
    walkIn: number
    /** Membership windows that ended in the bucket and were not renewed — the
     *  same figure as the Retention tab's `churned` column. */
    churned: number
    /** joins − churned. Member-count growth, not revenue growth. */
    net: number
}

/**
 * Joins per bucket, with churn from the same windows the Retention tab uses so
 * that net growth is joins − churned on identical definitions.
 */
export function joinBuckets(rows: JoinRow[], windows: MembershipWindow[], range: DateRange, bucket: Bucket): JoinBucket[] {
    const churnByStart = new Map(retentionBuckets(windows, range, bucket).map((b) => [b.start, b.churned]))
    const acc = new Map<string, JoinBucket>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        const churned = churnByStart.get(start) ?? 0
        acc.set(start, { start, label: bucketLabel(start, bucket), joins: 0, referral: 0, walkIn: 0, churned, net: -churned })
    }
    for (const row of rows) {
        const target = acc.get(bucketStart(row.joinDate, bucket))
        if (!target) continue
        target.joins += 1
        if (row.source === 'referral') target.referral += 1
        else target.walkIn += 1
        target.net = target.joins - target.churned
    }
    return [...acc.values()]
}

// ─── Retention: reactivation ─────────────────────────────────────────────────

/**
 * A window is a reactivation when the same member had an earlier window and
 * this one starts more than 30 days after that earlier window ended — the
 * exact complement of `isRenewed`'s 30-day grace, so a window is either a
 * renewal of its predecessor or a reactivation after it, never both. A
 * member's first window is neither.
 */
export function isReactivation(window: MembershipWindow, all: MembershipWindow[]): boolean {
    let previous: MembershipWindow | null = null
    for (const w of all) {
        if (w.member_id !== window.member_id || w === window || w.start >= window.start) continue
        if (!previous || w.end > previous.end) previous = w
    }
    if (!previous) return false
    return window.start > addDaysIso(previous.end, 30)
}

export type ReactivationBucket = { start: string; label: string; reactivated: number }

export function reactivationBuckets(windows: MembershipWindow[], range: DateRange, bucket: Bucket): ReactivationBucket[] {
    const acc = new Map<string, ReactivationBucket>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        acc.set(start, { start, label: bucketLabel(start, bucket), reactivated: 0 })
    }
    for (const window of windows) {
        if (window.start < range.from || window.start > range.to) continue
        if (!isReactivation(window, windows)) continue
        const target = acc.get(bucketStart(window.start, bucket))
        if (target) target.reactivated += 1
    }
    return [...acc.values()]
}

export function reactivationCount(buckets: ReactivationBucket[]): number {
    return buckets.reduce((s, b) => s + b.reactivated, 0)
}

// ─── Retention: total paid per member ────────────────────────────────────────

export type PaidSummary = {
    /** Members with at least one paid payment on record. */
    members: number
    /** Mean of each member's total recorded payments. */
    average: number
    median: number
}

/**
 * Total recorded payments attributed to each member, across all history the
 * report already fetched. This is a backward-looking sum — what members have
 * actually paid — and nothing more; it is not a prediction of future value.
 */
export function totalPaidPerMember(payments: PaymentStub[]): Map<string, number> {
    const totals = new Map<string, number>()
    for (const p of payments) totals.set(p.member_id, (totals.get(p.member_id) ?? 0) + p.amount)
    return totals
}

export function paidSummary(payments: PaymentStub[]): PaidSummary | null {
    const totals = [...totalPaidPerMember(payments).values()].sort((a, b) => a - b)
    if (totals.length === 0) return null
    const sum = totals.reduce((s, v) => s + v, 0)
    const mid = Math.floor(totals.length / 2)
    const median = totals.length % 2 ? totals[mid] : (totals[mid - 1] + totals[mid]) / 2
    return { members: totals.length, average: sum / totals.length, median }
}

// ─── Retention: cohorts ──────────────────────────────────────────────────────

export type CohortRow = {
    /** `yyyy-MM` of the join month. */
    cohort: string
    label: string
    members: number
    /** Per offset month: share (0–100) of the cohort with a membership window
     *  covering any day of that calendar month; null for months not yet
     *  reached. Index 0 is the join month itself. */
    retained: (number | null)[]
}

export type CohortReport = { rows: CohortRow[]; months: number }

function monthKey(date: string): string {
    return date.slice(0, 7)
}

function addMonthsKey(key: string, months: number): string {
    return format(addMonths(parseISO(`${key}-01`), months), 'yyyy-MM')
}

/**
 * Month-by-month retention of each join cohort, from the membership windows
 * the Retention tab already holds. Cohorts are members whose join date falls
 * in the selected range, grouped by join month and capped to the most recent
 * `maxCohorts`. A member counts as retained in offset month k when any of
 * their windows overlaps calendar month (cohort + k). Month 0 is below 100%
 * exactly when some members of the cohort joined without a membership
 * window in their join month — that is the fact, so it is left as is.
 */
export function cohortRetention(
    members: ReportMemberRow[],
    windows: MembershipWindow[],
    range: DateRange,
    today: string,
    options: { maxCohorts?: number; maxMonths?: number } = {},
): CohortReport {
    const { maxCohorts = 12, maxMonths = 12 } = options
    const windowsByMember = new Map<string, MembershipWindow[]>()
    for (const w of windows) {
        const list = windowsByMember.get(w.member_id)
        if (list) list.push(w)
        else windowsByMember.set(w.member_id, [w])
    }

    const cohorts = new Map<string, string[]>()
    for (const m of members) {
        const joined = istDate(m.created_at)
        if (joined < range.from || joined > range.to) continue
        const key = monthKey(joined)
        const list = cohorts.get(key)
        if (list) list.push(m.id)
        else cohorts.set(key, [m.id])
    }

    const keys = [...cohorts.keys()].sort().slice(-maxCohorts)
    const currentMonth = monthKey(today)
    const months = keys.length
        ? Math.min(maxMonths, Math.max(...keys.map((k) => monthsBetween(k, currentMonth)))) + 1
        : 0

    const rows = keys.map((key) => {
        const ids = cohorts.get(key) as string[]
        const retained: (number | null)[] = []
        for (let k = 0; k < months; k++) {
            const month = addMonthsKey(key, k)
            if (month > currentMonth) { retained.push(null); continue }
            const first = `${month}-01`
            const last = format(addDays(addMonths(parseISO(first), 1), -1), 'yyyy-MM-dd')
            const count = ids.filter((id) => (windowsByMember.get(id) ?? []).some((w) => w.start <= last && w.end >= first)).length
            retained.push((count / ids.length) * 100)
        }
        return { cohort: key, label: format(parseISO(`${key}-01`), 'MMM yyyy'), members: ids.length, retained }
    })
    return { rows, months }
}

function monthsBetween(fromKey: string, toKey: string): number {
    const [fy, fm] = fromKey.split('-').map(Number)
    const [ty, tm] = toKey.split('-').map(Number)
    return Math.max(0, (ty - fy) * 12 + (tm - fm))
}

// ─── Roster: membership value ────────────────────────────────────────────────

export type MembershipValue = {
    /** Active and expiring members on a plan, i.e. the rows in `planDistribution`. */
    members: number
    /**
     * Σ members × plan monthly value, using the same normalised monthly value
     * (`price × 30 / duration_days`) the plan distribution shows. It is the
     * membership base's normalised monthly plan value — not recognised
     * revenue, and admission fees are not part of it.
     */
    mrr: number
    /** mrr × 12. */
    arr: number
}

export function membershipValue(plans: PlanRow[]): MembershipValue {
    const mrr = plans.reduce((s, p) => s + p.members * p.monthlyValue, 0)
    return { members: plans.reduce((s, p) => s + p.members, 0), mrr, arr: mrr * 12 }
}

// ─── Renewals: summary ───────────────────────────────────────────────────────

export type RenewalSummary = { in7: number; in15: number; in30: number; lapsed: number }

/** Counts behind the Renewals chips: expiring within 7 / 15 / 30 days, and
 *  windows that ended in the selected range without renewing. */
export function renewalSummary(members: ReportMemberRow[], payments: PaymentStub[], windows: MembershipWindow[], range: DateRange, today: string): RenewalSummary {
    return {
        in7: renewalsDue(members, payments, today, 7).length,
        in15: renewalsDue(members, payments, today, 15).length,
        in30: renewalsDue(members, payments, today, 30).length,
        lapsed: lapsed(members, windows, payments, range, today).length,
    }
}

// ─── Inactive: summary and at-risk ───────────────────────────────────────────

export type InactiveSummary = {
    /** Active or expiring members — the base every count is drawn from. */
    activeBase: number
    over7: number
    over14: number
    over30: number
}

/** The three inactivity windows at once, from one set of last visits that
 *  reaches back at least 30 days. */
export function inactiveSummary(members: ReportMemberRow[], lastVisits: Map<string, string>, today: string): InactiveSummary {
    const activeBase = members.filter((m) => {
        const status = effectiveStatus(m, today)
        return status === 'active' || status === 'expiring'
    }).length
    return {
        activeBase,
        over7: inactive(members, lastVisits, today, 7).length,
        over14: inactive(members, lastVisits, today, 14).length,
        over30: inactive(members, lastVisits, today, 30).length,
    }
}

export type AtRiskRow = InactiveRow & { daysLeft: number }

/**
 * Inactive members whose membership also expires within `horizon` days. Two
 * facts side by side — no score. A row here is a member to contact, not a
 * member who has churned.
 */
export function atRisk(rows: InactiveRow[], today: string, horizon = 30): AtRiskRow[] {
    const limit = addDaysIso(today, horizon)
    return rows
        .filter((r) => r.expiry !== null && r.expiry >= today && r.expiry <= limit)
        .map((r) => ({ ...r, daysLeft: daysBetweenInclusive({ from: today, to: r.expiry as string }) - 1 }))
        .sort((a, b) => a.daysLeft - b.daysLeft || (b.daysSince ?? Number.MAX_SAFE_INTEGER) - (a.daysSince ?? Number.MAX_SAFE_INTEGER))
}

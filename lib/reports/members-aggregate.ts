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

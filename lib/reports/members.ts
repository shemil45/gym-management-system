import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonationOwnedIds } from '@/lib/platform/impersonation-ledger'
import { addDaysIso, type DateRange } from '@/lib/reports/dates'
import type { Horizon, InactiveDays, MembersReportQuery } from '@/lib/reports/members-params'
import { fetchPaymentRows } from '@/lib/reports/payments'
import {
    atRisk, churned, cohortRetention, historyRange, inactive, inactiveSummary, istDate, joinBuckets, joinKpis, joinSummary, joins, lapsed,
    membershipValue, paidSummary, planDistribution, reactivationBuckets, reactivationCount, renewalSummary, renewalsDue,
    retentionBuckets, retentionTotals, rosterCounts, windowsFrom,
    type AtRiskRow, type CohortReport, type InactiveRow, type InactiveSummary, type JoinBucket, type JoinKpis, type JoinRow, type JoinSummary,
    type LapsedRow, type MembershipValue, type PaidSummary, type PaymentStub, type PlanRow, type ReactivationBucket, type RenewalRow,
    type RenewalSummary, type ReportMemberRow, type RetentionBucket, type RosterCounts,
} from '@/lib/reports/members-aggregate'
import type { Comparison } from '@/lib/reports/comparison'
import { INACTIVE_DAYS } from '@/lib/reports/members-params'

const MEMBER_SELECT = [
    'id', 'member_id', 'full_name', 'phone', 'status', 'membership_plan_id',
    'membership_start_date', 'membership_expiry_date', 'referred_by', 'referral_coins_balance', 'created_at',
    'plan:membership_plans(name, price, duration_days)',
    // Self-referencing FK: PostgREST rejects the constraint-name hint here
    // (PGRST200), so disambiguate by the referencing column instead.
    'referrer:members!referred_by(full_name)',
].join(', ')

type MemberRawRow = {
    id: string
    member_id: string
    full_name: string
    phone: string
    status: ReportMemberRow['status']
    membership_plan_id: string | null
    membership_start_date: string | null
    membership_expiry_date: string | null
    referred_by: string | null
    referral_coins_balance: number | string | null
    created_at: string
    plan: { name: string; price: number | string; duration_days: number } | { name: string; price: number | string; duration_days: number }[] | null
    referrer: { full_name: string } | { full_name: string }[] | null
}

type CheckInRawRow = { member_id: string; check_in_time: string }

const PAGE_SIZE = 1000

function one<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? value[0] ?? null : value
}

function toNumber(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
    return Number.isFinite(parsed) ? parsed : 0
}

export async function fetchMembers(gymId: string): Promise<ReportMemberRow[]> {
    const db = getSupabaseAdmin()
    const fetchPage = (from: number, to: number) =>
        db.from('members').select(MEMBER_SELECT).eq('gym_id', gymId)
            .order('created_at', { ascending: true }).order('id', { ascending: true })
            .range(from, to)

    const [firstPage, demoIds] = await Promise.all([fetchPage(0, PAGE_SIZE - 1), getImpersonationOwnedIds(gymId, 'member')])
    if (firstPage.error) throw new Error(`Members report query failed: ${firstPage.error.message}`)
    const raw: MemberRawRow[] = [...((firstPage.data ?? []) as unknown as MemberRawRow[])]
    let page = 1
    let lastSize = raw.length
    while (lastSize === PAGE_SIZE) {
        const result = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (result.error) throw new Error(`Members report query failed: ${result.error.message}`)
        const rows = (result.data ?? []) as unknown as MemberRawRow[]
        raw.push(...rows)
        lastSize = rows.length
        page += 1
    }

    return raw.map((row) => {
        const plan = one(row.plan)
        const referrer = one(row.referrer)
        return {
            id: row.id,
            member_code: row.member_id,
            full_name: row.full_name,
            phone: row.phone,
            status: row.status,
            plan_id: row.membership_plan_id,
            plan_name: plan?.name ?? null,
            plan_price: toNumber(plan?.price),
            plan_duration_days: plan?.duration_days ?? 0,
            membership_start_date: row.membership_start_date,
            membership_expiry_date: row.membership_expiry_date,
            referred_by: row.referred_by,
            referrer_name: referrer?.full_name ?? null,
            referral_coins_balance: toNumber(row.referral_coins_balance),
            created_at: row.created_at,
            is_demo: demoIds.has(row.id),
        }
    })
}

export async function fetchPaidStubs(gymId: string, range: DateRange): Promise<PaymentStub[]> {
    const rows = await fetchPaymentRows(gymId, range)
    return rows
        .filter((row) => row.payment_status === 'paid')
        .map((row) => ({
            member_id: row.member_id,
            amount: row.amount,
            payment_date: row.payment_date,
            membership_start_date: row.membership_start_date,
            membership_end_date: row.membership_end_date,
            plan_name: row.plan_name,
        }))
}

export async function fetchLastVisits(gymId: string, since: string): Promise<Map<string, string>> {
    const db = getSupabaseAdmin()
    const fetchPage = (from: number, to: number) =>
        db.from('check_ins').select('member_id, check_in_time').eq('gym_id', gymId)
            .gte('check_in_time', `${since}T00:00:00+05:30`)
            .order('check_in_time', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to)

    const firstPage = await fetchPage(0, PAGE_SIZE - 1)
    if (firstPage.error) throw new Error(`Members report query failed: ${firstPage.error.message}`)
    const raw: CheckInRawRow[] = [...((firstPage.data ?? []) as unknown as CheckInRawRow[])]
    let page = 1
    let lastSize = raw.length
    while (lastSize === PAGE_SIZE) {
        const result = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (result.error) throw new Error(`Members report query failed: ${result.error.message}`)
        const rows = (result.data ?? []) as unknown as CheckInRawRow[]
        raw.push(...rows)
        lastSize = rows.length
        page += 1
    }

    const lastVisits = new Map<string, string>()
    for (const row of raw) {
        if (!lastVisits.has(row.member_id)) lastVisits.set(row.member_id, istDate(row.check_in_time))
    }
    return lastVisits
}

/**
 * Every report below is built from the fetches the tab already made — the
 * roster and the all-history paid stubs for the period tabs, the roster alone
 * for Roster, the roster plus recent check-ins for Inactive. The analytics
 * fields are further views of those same rows; no tab fetches more than it
 * did before this layer existed.
 */
export type JoinsReport = {
    rows: JoinRow[]
    kpis: JoinKpis
    previous: JoinKpis | null
    compare: Comparison
    summary: JoinSummary
    previousSummary: JoinSummary | null
    /** Joins and churn per bucket over the selected range. */
    buckets: JoinBucket[]
    comparisonBuckets: JoinBucket[] | null
}
export type RenewalsReport = (
    | { mode: 'upcoming'; rows: RenewalRow[]; horizon: Horizon }
    | { mode: 'lapsed'; rows: LapsedRow[] }
) & { summary: RenewalSummary }
export type RetentionReport = {
    buckets: RetentionBucket[]
    totals: ReturnType<typeof retentionTotals>
    previous: ReturnType<typeof retentionTotals> | null
    compare: Comparison
    comparisonBuckets: RetentionBucket[] | null
    churned: LapsedRow[]
    reactivations: ReactivationBucket[]
    reactivated: number
    /** Total recorded payments per member, summarised; null with no payments. */
    paid: PaidSummary | null
    cohorts: CohortReport
}
export type RosterReport = { counts: RosterCounts; plans: PlanRow[]; asOf: string; value: MembershipValue }
export type InactiveReport = { rows: InactiveRow[]; days: InactiveDays; summary: InactiveSummary; atRisk: AtRiskRow[] }

export async function getJoins(gymId: string, query: MembersReportQuery): Promise<JoinsReport> {
    const [members, payments] = await Promise.all([
        fetchMembers(gymId),
        fetchPaidStubs(gymId, historyRange(query.today)),
    ])
    const windows = windowsFrom(payments)
    const rows = joins(members, payments, query.range)
    const previousRows = query.previous ? joins(members, payments, query.previous) : null
    return {
        rows,
        kpis: joinKpis(rows),
        previous: previousRows ? joinKpis(previousRows) : null,
        compare: query.compare,
        summary: joinSummary(rows),
        previousSummary: previousRows ? joinSummary(previousRows) : null,
        buckets: joinBuckets(rows, windows, query.range, query.bucket),
        comparisonBuckets: previousRows && query.previous ? joinBuckets(previousRows, windows, query.previous, query.bucket) : null,
    }
}

export async function getRenewals(gymId: string, query: MembersReportQuery): Promise<RenewalsReport> {
    const [members, payments] = await Promise.all([
        fetchMembers(gymId),
        fetchPaidStubs(gymId, historyRange(query.today)),
    ])
    const windows = windowsFrom(payments)
    const summary = renewalSummary(members, payments, windows, query.range, query.today)
    if (query.lapsed) {
        return { mode: 'lapsed', rows: lapsed(members, windows, payments, query.range, query.today), summary }
    }
    return { mode: 'upcoming', rows: renewalsDue(members, payments, query.today, query.horizon), horizon: query.horizon, summary }
}

export async function getRetention(gymId: string, query: MembersReportQuery): Promise<RetentionReport> {
    const [members, payments] = await Promise.all([
        fetchMembers(gymId),
        fetchPaidStubs(gymId, historyRange(query.today)),
    ])
    const windows = windowsFrom(payments)
    const buckets = retentionBuckets(windows, query.range, query.bucket)
    const previousBuckets = query.previous ? retentionBuckets(windows, query.previous, query.bucket) : null
    const reactivations = reactivationBuckets(windows, query.range, query.bucket)
    return {
        buckets,
        totals: retentionTotals(buckets),
        previous: previousBuckets ? retentionTotals(previousBuckets) : null,
        compare: query.compare,
        comparisonBuckets: previousBuckets,
        churned: churned(members, windows, payments, query.range),
        reactivations,
        reactivated: reactivationCount(reactivations),
        paid: paidSummary(payments),
        cohorts: cohortRetention(members, windows, query.range, query.today),
    }
}

export async function getRoster(gymId: string, today: string): Promise<RosterReport> {
    const members = await fetchMembers(gymId)
    const plans = planDistribution(members, today)
    return { counts: rosterCounts(members, today), plans, asOf: today, value: membershipValue(plans) }
}

export async function getInactive(gymId: string, query: MembersReportQuery): Promise<InactiveReport> {
    // Visits are fetched back to the widest inactivity window (30 days), not
    // just the selected one, so the 7 / 14 / 30-day summary can be counted
    // from one fetch and an inactive member's actual last visit is known when
    // it fell inside that window. `inactive()` itself is unchanged, so the
    // member list is identical to before; only `lastVisit` is now populated
    // where it used to be null.
    const widest = Math.max(...INACTIVE_DAYS)
    const cutoff = addDaysIso(query.today, -(widest - 1))
    const [members, lastVisits] = await Promise.all([fetchMembers(gymId), fetchLastVisits(gymId, cutoff)])
    const rows = inactive(members, lastVisits, query.today, query.days)
    return { rows, days: query.days, summary: inactiveSummary(members, lastVisits, query.today), atRisk: atRisk(rows, query.today) }
}

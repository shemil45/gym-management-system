import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonationOwnedIds } from '@/lib/platform/impersonation-ledger'
import { addDaysIso, type DateRange } from '@/lib/reports/dates'
import type { Horizon, InactiveDays, MembersReportQuery } from '@/lib/reports/members-params'
import { fetchPaymentRows } from '@/lib/reports/payments'
import {
    churned, historyRange, inactive, istDate, joinKpis, joins, lapsed,
    planDistribution, renewalsDue, retentionBuckets, retentionTotals, rosterCounts, windowsFrom,
    type InactiveRow, type JoinKpis, type JoinRow, type LapsedRow, type PaymentStub,
    type PlanRow, type RenewalRow, type ReportMemberRow, type RetentionBucket, type RosterCounts,
} from '@/lib/reports/members-aggregate'

const MEMBER_SELECT = [
    'id', 'member_id', 'full_name', 'phone', 'status', 'membership_plan_id',
    'membership_start_date', 'membership_expiry_date', 'referred_by', 'created_at',
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

export type JoinsReport = { rows: JoinRow[]; kpis: JoinKpis; previous: JoinKpis }
export type RenewalsReport =
    | { mode: 'upcoming'; rows: RenewalRow[]; horizon: Horizon }
    | { mode: 'lapsed'; rows: LapsedRow[] }
export type RetentionReport = {
    buckets: RetentionBucket[]
    totals: ReturnType<typeof retentionTotals>
    previous: ReturnType<typeof retentionTotals>
    churned: LapsedRow[]
}
export type RosterReport = { counts: RosterCounts; plans: PlanRow[]; asOf: string }
export type InactiveReport = { rows: InactiveRow[]; days: InactiveDays }

export async function getJoins(gymId: string, query: MembersReportQuery): Promise<JoinsReport> {
    const [members, payments] = await Promise.all([
        fetchMembers(gymId),
        fetchPaidStubs(gymId, historyRange(query.today)),
    ])
    const rows = joins(members, payments, query.range)
    const previousRows = joins(members, payments, query.previous)
    return { rows, kpis: joinKpis(rows), previous: joinKpis(previousRows) }
}

export async function getRenewals(gymId: string, query: MembersReportQuery): Promise<RenewalsReport> {
    const [members, payments] = await Promise.all([
        fetchMembers(gymId),
        fetchPaidStubs(gymId, historyRange(query.today)),
    ])
    if (query.lapsed) {
        const windows = windowsFrom(payments)
        return { mode: 'lapsed', rows: lapsed(members, windows, payments, query.range, query.today) }
    }
    return { mode: 'upcoming', rows: renewalsDue(members, payments, query.today, query.horizon), horizon: query.horizon }
}

export async function getRetention(gymId: string, query: MembersReportQuery): Promise<RetentionReport> {
    const [members, payments] = await Promise.all([
        fetchMembers(gymId),
        fetchPaidStubs(gymId, historyRange(query.today)),
    ])
    const windows = windowsFrom(payments)
    const buckets = retentionBuckets(windows, query.range, query.bucket)
    const previousBuckets = retentionBuckets(windows, query.previous, query.bucket)
    return {
        buckets,
        totals: retentionTotals(buckets),
        previous: retentionTotals(previousBuckets),
        churned: churned(members, windows, payments, query.range),
    }
}

export async function getRoster(gymId: string, today: string): Promise<RosterReport> {
    const members = await fetchMembers(gymId)
    return { counts: rosterCounts(members, today), plans: planDistribution(members, today), asOf: today }
}

export async function getInactive(gymId: string, query: MembersReportQuery): Promise<InactiveReport> {
    // Same cutoff `inactive()` applies internally: a visit before this date
    // doesn't change whether a member counts as inactive, so there is no
    // need to fetch it.
    const cutoff = addDaysIso(query.today, -(query.days - 1))
    const [members, lastVisits] = await Promise.all([fetchMembers(gymId), fetchLastVisits(gymId, cutoff)])
    return { rows: inactive(members, lastVisits, query.today, query.days), days: query.days }
}

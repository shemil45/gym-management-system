import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { addDaysIso, type DateRange } from '@/lib/reports/dates'
import { REFERRER_BONUS_COINS } from '@/lib/payments/settle-member-payment'
import { fetchMembers } from '@/lib/reports/members'
import { fetchPaymentRows } from '@/lib/reports/payments'
import type { ReferralsReportQuery } from '@/lib/reports/referrals-params'
import {
    conversionTiming, funnel, joinMix, joinMixBuckets, leaderboard, leaderboardTotals, linkFunnel, outstandingBalance, overviewBuckets, overviewKpis,
    overviewTotals, referralList, referredRevenue, referrerActivity,
    type ConversionTiming, type Funnel, type JoinMix, type JoinMixBucket, type LeaderRow, type LeaderboardTotals, type LinkFunnel, type ListRow,
    type ListStatus, type OverviewBucket, type OverviewKpis, type ReferralStatus, type ReferredRevenue, type ReferrerSlice,
    type ReportReferralRow,
} from '@/lib/reports/referrals-aggregate'
import type { Comparison } from '@/lib/reports/comparison'
import { effectiveReferralStatus } from '@/lib/referrals/lead'

const SELECT = [
    'id', 'referrer_id', 'referred_id', 'referral_code', 'status', 'source', 'created_at', 'applied_at', 'expires_at', 'cancelled_at', 'referred_name',
    'referrer:members!referrer_id(full_name, member_id, phone)',
    'referred:members!referred_id(full_name, member_id)',
].join(', ')

type RawRow = {
    id: string
    referrer_id: string
    referred_id: string | null
    referral_code: string | null
    status: ReferralStatus
    source: 'link' | 'staff'
    created_at: string
    applied_at: string | null
    expires_at: string | null
    cancelled_at: string | null
    referred_name: string | null
    referrer: { full_name: string; member_id: string; phone: string } | { full_name: string; member_id: string; phone: string }[] | null
    referred: { full_name: string; member_id: string } | { full_name: string; member_id: string }[] | null
}

function one<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? value[0] ?? null : value
}

function toRow(row: RawRow): ReportReferralRow {
    const referrer = one(row.referrer)
    const referred = one(row.referred)
    return {
        id: row.id,
        referrer_id: row.referrer_id,
        referred_id: row.referred_id,
        code: row.referral_code,
        // Effective, not stored: a pending lead past its expiry is expired
        // here even if the daily sweep has not flipped the row yet.
        status: effectiveReferralStatus(row),
        source: row.source,
        created_at: row.created_at,
        applied_at: row.applied_at,
        expires_at: row.expires_at,
        cancelled_at: row.cancelled_at,
        referrer_name: referrer?.full_name ?? null,
        referrer_code: referrer?.member_id ?? null,
        referrer_phone: referrer?.phone ?? null,
        // A lead carries its own name until it becomes a member.
        referred_name: referred?.full_name ?? row.referred_name ?? null,
        referred_code: referred?.member_id ?? null,
    }
}

const PAGE_SIZE = 1000

async function fetchByDateColumn(gymId: string, column: 'created_at' | 'applied_at', range: DateRange): Promise<RawRow[]> {
    const db = getSupabaseAdmin()
    const fetchPage = (from: number, to: number) =>
        db.from('referrals').select(SELECT).eq('gym_id', gymId)
            .gte(column, `${range.from}T00:00:00+05:30`)
            .lt(column, `${addDaysIso(range.to, 1)}T00:00:00+05:30`)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to)

    const firstPage = await fetchPage(0, PAGE_SIZE - 1)
    if (firstPage.error) throw new Error(`Referrals report query failed: ${firstPage.error.message}`)
    const raw: RawRow[] = [...((firstPage.data ?? []) as unknown as RawRow[])]
    let page = 1
    let lastSize = raw.length
    while (lastSize === PAGE_SIZE) {
        const result = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (result.error) throw new Error(`Referrals report query failed: ${result.error.message}`)
        const rows = (result.data ?? []) as unknown as RawRow[]
        raw.push(...rows)
        lastSize = rows.length
        page += 1
    }
    return raw
}

export async function fetchReferrals(gymId: string, range: DateRange): Promise<ReportReferralRow[]> {
    const [byCreated, byApplied] = await Promise.all([
        fetchByDateColumn(gymId, 'created_at', range),
        fetchByDateColumn(gymId, 'applied_at', range),
    ])
    const byId = new Map<string, RawRow>()
    for (const row of byCreated) byId.set(row.id, row)
    for (const row of byApplied) byId.set(row.id, row)
    return [...byId.values()].map(toRow)
}

/**
 * Everything the Overview shows, from the fetches it already made: the
 * period's referrals and payments, the comparison period's (only when
 * comparison is on), and the roster. `buckets`, `totals`, `kpis`, `previous`
 * and `outstanding` are the original fields the table and CSV read; the rest
 * is derived from the same rows. `bonus` is REFERRER_BONUS_COINS, carried so
 * the UI can say how coins issued was derived.
 */
export type OverviewReport = {
    buckets: OverviewBucket[]
    totals: ReturnType<typeof overviewTotals>
    kpis: OverviewKpis
    previous: OverviewKpis | null
    /** Actual: the sum of every member's current coin balance. */
    outstanding: number
    compare: Comparison
    comparisonBuckets: OverviewBucket[] | null
    bonus: number
    funnel: Funnel
    links: LinkFunnel
    timing: ConversionTiming
    /** The period's referrers, same rows the Leaderboard tab shows. */
    referrers: LeaderRow[]
    activity: ReferrerSlice[]
    referred: ReferredRevenue
    previousReferred: ReferredRevenue | null
    joinMix: JoinMix
    previousJoinMix: JoinMix | null
    joinMixBuckets: JoinMixBucket[]
}
export type LeaderboardReport = { rows: LeaderRow[]; totals: LeaderboardTotals; activity: ReferrerSlice[] }
export type ListReport = { rows: ListRow[]; status: ListStatus }

export async function getOverview(gymId: string, query: ReferralsReportQuery): Promise<OverviewReport> {
    const [currentReferrals, previousReferrals, currentPayments, previousPayments, members] = await Promise.all([
        fetchReferrals(gymId, query.range),
        query.previous ? fetchReferrals(gymId, query.previous) : Promise.resolve(null),
        fetchPaymentRows(gymId, query.range),
        query.previous ? fetchPaymentRows(gymId, query.previous) : Promise.resolve(null),
        fetchMembers(gymId),
    ])
    const buckets = overviewBuckets(currentReferrals, currentPayments, query.range, query.bucket, REFERRER_BONUS_COINS)
    const totals = overviewTotals(buckets)
    const prev = query.previous
    const compared = previousReferrals !== null && previousPayments !== null && prev !== null
    const referrers = leaderboard(currentReferrals, members, query.range, REFERRER_BONUS_COINS)
    const links = linkFunnel(members, query.range)
    return {
        buckets,
        totals,
        kpis: overviewKpis(currentReferrals, currentPayments, query.range, REFERRER_BONUS_COINS),
        previous: compared ? overviewKpis(previousReferrals, previousPayments, prev, REFERRER_BONUS_COINS) : null,
        outstanding: outstandingBalance(members),
        compare: query.compare,
        comparisonBuckets: compared ? overviewBuckets(previousReferrals, previousPayments, prev, query.bucket, REFERRER_BONUS_COINS) : null,
        bonus: REFERRER_BONUS_COINS,
        funnel: funnel(totals, links, REFERRER_BONUS_COINS),
        links,
        timing: conversionTiming(currentReferrals, query.range),
        referrers,
        activity: referrerActivity(referrers),
        referred: referredRevenue(currentPayments, members),
        previousReferred: compared ? referredRevenue(previousPayments, members) : null,
        joinMix: joinMix(members, query.range),
        previousJoinMix: compared ? joinMix(members, prev) : null,
        joinMixBuckets: joinMixBuckets(members, query.range, query.bucket),
    }
}

export async function getLeaderboard(gymId: string, query: ReferralsReportQuery): Promise<LeaderboardReport> {
    const [referrals, members] = await Promise.all([
        fetchReferrals(gymId, query.range),
        fetchMembers(gymId),
    ])
    const rows = leaderboard(referrals, members, query.range, REFERRER_BONUS_COINS)
    return { rows, totals: leaderboardTotals(rows), activity: referrerActivity(rows) }
}

export async function getReferralList(gymId: string, query: ReferralsReportQuery): Promise<ListReport> {
    const referrals = await fetchReferrals(gymId, query.range)
    return { rows: referralList(referrals, query.range, query.status), status: query.status }
}

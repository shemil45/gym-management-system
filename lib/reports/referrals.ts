import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { addDaysIso, type DateRange } from '@/lib/reports/dates'
import { REFERRER_BONUS_COINS } from '@/lib/payments/settle-member-payment'
import { fetchMembers } from '@/lib/reports/members'
import { fetchPaymentRows } from '@/lib/reports/payments'
import type { ReferralsReportQuery } from '@/lib/reports/referrals-params'
import {
    leaderboard, outstandingBalance, overviewBuckets, overviewKpis, overviewTotals, referralList,
    type LeaderRow, type ListRow, type ListStatus, type OverviewBucket, type OverviewKpis, type ReferralStatus,
    type ReportReferralRow,
} from '@/lib/reports/referrals-aggregate'

const SELECT = [
    'id', 'referrer_id', 'referred_id', 'referral_code', 'status', 'created_at', 'applied_at',
    'referrer:members!referrer_id(full_name, member_id, phone)',
    'referred:members!referred_id(full_name, member_id)',
].join(', ')

type RawRow = {
    id: string
    referrer_id: string
    referred_id: string
    referral_code: string | null
    status: ReferralStatus
    created_at: string
    applied_at: string | null
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
        status: row.status,
        created_at: row.created_at,
        applied_at: row.applied_at,
        referrer_name: referrer?.full_name ?? null,
        referrer_code: referrer?.member_id ?? null,
        referrer_phone: referrer?.phone ?? null,
        referred_name: referred?.full_name ?? null,
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

export type OverviewReport = {
    buckets: OverviewBucket[]
    totals: ReturnType<typeof overviewTotals>
    kpis: OverviewKpis
    previous: OverviewKpis
    outstanding: number
}
export type LeaderboardReport = { rows: LeaderRow[] }
export type ListReport = { rows: ListRow[]; status: ListStatus }

export async function getOverview(gymId: string, query: ReferralsReportQuery): Promise<OverviewReport> {
    const [currentReferrals, previousReferrals, currentPayments, previousPayments, members] = await Promise.all([
        fetchReferrals(gymId, query.range),
        fetchReferrals(gymId, query.previous),
        fetchPaymentRows(gymId, query.range),
        fetchPaymentRows(gymId, query.previous),
        fetchMembers(gymId),
    ])
    const buckets = overviewBuckets(currentReferrals, currentPayments, query.range, query.bucket, REFERRER_BONUS_COINS)
    return {
        buckets,
        totals: overviewTotals(buckets),
        kpis: overviewKpis(currentReferrals, currentPayments, query.range, REFERRER_BONUS_COINS),
        previous: overviewKpis(previousReferrals, previousPayments, query.previous, REFERRER_BONUS_COINS),
        outstanding: outstandingBalance(members),
    }
}

export async function getLeaderboard(gymId: string, query: ReferralsReportQuery): Promise<LeaderboardReport> {
    const [referrals, members] = await Promise.all([
        fetchReferrals(gymId, query.range),
        fetchMembers(gymId),
    ])
    return { rows: leaderboard(referrals, members, query.range, REFERRER_BONUS_COINS) }
}

export async function getReferralList(gymId: string, query: ReferralsReportQuery): Promise<ListReport> {
    const referrals = await fetchReferrals(gymId, query.range)
    return { rows: referralList(referrals, query.range, query.status), status: query.status }
}

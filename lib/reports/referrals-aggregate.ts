import { addDays, addMonths, format, parseISO } from 'date-fns'
import { bucketLabel, bucketStart, daysBetweenInclusive, type Bucket, type DateRange } from '@/lib/reports/dates'
import { istDate, type ReportMemberRow } from '@/lib/reports/members-aggregate'
import type { ReportPaymentRow } from '@/lib/reports/payments-aggregate'

// The app never writes 'expired' today (a referral only moves pending -> applied,
// via creditReferrers); the column and chip exist for completeness.
export type ReferralStatus = 'pending' | 'applied' | 'expired'

export type ReportReferralRow = {
    id: string
    referrer_id: string
    referred_id: string
    code: string | null
    status: ReferralStatus
    created_at: string
    applied_at: string | null
    referrer_name: string | null
    referrer_code: string | null
    referrer_phone: string | null
    referred_name: string | null
    referred_code: string | null
}

function nextBucketStart(start: string, bucket: Bucket): string {
    const day = parseISO(start)
    const next = bucket === 'day' ? addDays(day, 1) : bucket === 'week' ? addDays(day, 7) : addMonths(day, 1)
    return format(next, 'yyyy-MM-dd')
}

function inRange(date: string, range: DateRange): boolean {
    return date >= range.from && date <= range.to
}

// ─── Overview ────────────────────────────────────────────────────────────────

export type OverviewBucket = {
    start: string
    label: string
    created: number
    converted: number
    pending: number
    expired: number
    conversion: number | null
    coinsIssued: number
    coinsRedeemed: number
}

export function overviewBuckets(
    referrals: ReportReferralRow[],
    payments: ReportPaymentRow[],
    range: DateRange,
    bucket: Bucket,
    bonus: number,
): OverviewBucket[] {
    const acc = new Map<string, Omit<OverviewBucket, 'conversion'>>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        acc.set(start, { start, label: bucketLabel(start, bucket), created: 0, converted: 0, pending: 0, expired: 0, coinsIssued: 0, coinsRedeemed: 0 })
    }

    for (const referral of referrals) {
        const createdDate = istDate(referral.created_at)
        if (inRange(createdDate, range)) {
            const target = acc.get(bucketStart(createdDate, bucket))
            if (target) {
                target.created += 1
                if (referral.status === 'pending') target.pending += 1
                if (referral.status === 'expired') target.expired += 1
            }
        }
        if (referral.applied_at) {
            const appliedDate = istDate(referral.applied_at)
            if (inRange(appliedDate, range)) {
                const target = acc.get(bucketStart(appliedDate, bucket))
                if (target) {
                    target.converted += 1
                    target.coinsIssued += bonus
                }
            }
        }
    }

    for (const row of payments) {
        if (row.payment_status !== 'paid') continue
        if (!inRange(row.payment_date, range)) continue
        const target = acc.get(bucketStart(row.payment_date, bucket))
        if (target) target.coinsRedeemed += row.referral_coins_used
    }

    return [...acc.values()].map((b) => ({ ...b, conversion: b.created ? (b.converted / b.created) * 100 : null }))
}

export function overviewTotals(buckets: OverviewBucket[]): Omit<OverviewBucket, 'start' | 'label'> {
    const sum = buckets.reduce(
        (t, b) => ({
            created: t.created + b.created,
            converted: t.converted + b.converted,
            pending: t.pending + b.pending,
            expired: t.expired + b.expired,
            coinsIssued: t.coinsIssued + b.coinsIssued,
            coinsRedeemed: t.coinsRedeemed + b.coinsRedeemed,
        }),
        { created: 0, converted: 0, pending: 0, expired: 0, coinsIssued: 0, coinsRedeemed: 0 },
    )
    return { ...sum, conversion: sum.created ? (sum.converted / sum.created) * 100 : null }
}

export type OverviewKpis = { referrals: number; conversions: number; coinsIssued: number; coinsRedeemed: number }

export function overviewKpis(referrals: ReportReferralRow[], payments: ReportPaymentRow[], range: DateRange, bonus: number): OverviewKpis {
    const created = referrals.filter((r) => inRange(istDate(r.created_at), range)).length
    const conversions = referrals.filter((r) => r.applied_at !== null && inRange(istDate(r.applied_at), range)).length
    const coinsRedeemed = payments
        .filter((p) => p.payment_status === 'paid' && inRange(p.payment_date, range))
        .reduce((s, p) => s + p.referral_coins_used, 0)
    return { referrals: created, conversions, coinsIssued: conversions * bonus, coinsRedeemed }
}

export function outstandingBalance(members: ReportMemberRow[]): number {
    return members.reduce((s, m) => s + m.referral_coins_balance, 0)
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderRow = { member: ReportMemberRow; referrals: number; converted: number; conversion: number | null; coinsEarned: number; balance: number }

export function leaderboard(referrals: ReportReferralRow[], members: ReportMemberRow[], range: DateRange, bonus: number): LeaderRow[] {
    const byId = new Map(members.map((m) => [m.id, m]))
    const groups = new Map<string, ReportReferralRow[]>()
    for (const referral of referrals) {
        if (!inRange(istDate(referral.created_at), range)) continue
        if (!byId.has(referral.referrer_id)) continue
        const rows = groups.get(referral.referrer_id) ?? []
        rows.push(referral)
        groups.set(referral.referrer_id, rows)
    }

    const rows: LeaderRow[] = []
    for (const [referrerId, referrerRows] of groups) {
        const member = byId.get(referrerId) as ReportMemberRow
        const total = referrerRows.length
        const converted = referrerRows.filter((r) => r.applied_at !== null).length
        rows.push({
            member,
            referrals: total,
            converted,
            conversion: total ? (converted / total) * 100 : null,
            coinsEarned: converted * bonus,
            balance: member.referral_coins_balance,
        })
    }

    return rows.sort((a, b) =>
        b.converted - a.converted
        || b.referrals - a.referrals
        || a.member.full_name.localeCompare(b.member.full_name),
    )
}

// ─── Referral list ───────────────────────────────────────────────────────────

export type ListStatus = 'all' | ReferralStatus
export type ListRow = ReportReferralRow & { daysToConvert: number | null }

export function referralList(referrals: ReportReferralRow[], range: DateRange, status: ListStatus): ListRow[] {
    return referrals
        .filter((r) => inRange(istDate(r.created_at), range))
        .filter((r) => status === 'all' || r.status === status)
        .map((r) => ({
            ...r,
            daysToConvert: r.applied_at
                ? daysBetweenInclusive({ from: istDate(r.created_at), to: istDate(r.applied_at) }) - 1
                : null,
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

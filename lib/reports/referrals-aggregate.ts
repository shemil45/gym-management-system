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

// ═══ Analytics layer ═════════════════════════════════════════════════════════
//
// Computed from what the Overview already fetches: the period's referrals and
// payments, and the full roster. Nothing here fetches, and nothing pretends
// the data has a reward ledger — coins issued stay a derived quantity
// (conversions × REFERRER_BONUS_COINS), coins redeemed are the actual
// `referral_coins_used` on paid payments, and the outstanding balance is the
// actual sum of member balances.

// ─── Funnel ──────────────────────────────────────────────────────────────────

export type Funnel = {
    created: number
    converted: number
    /** Derived: converted × bonus. There is no per-reward transaction to count. */
    coinsIssued: number
    bonus: number
}

/** Created → Converted, from the same totals the Overview table shows. */
export function funnel(totals: Pick<OverviewBucket, 'created' | 'converted'>, bonus: number): Funnel {
    return { created: totals.created, converted: totals.converted, coinsIssued: totals.converted * bonus, bonus }
}

/** Coins issued in the period less coins redeemed in it — a net movement,
 *  not the balance members hold (that is `outstandingBalance`). */
export function netCoins(coinsIssued: number, coinsRedeemed: number): number {
    return coinsIssued - coinsRedeemed
}

// ─── Conversion timing ───────────────────────────────────────────────────────

export type TimingBucketId = 'same-day' | '1-3' | '4-7' | '8-30' | '30+'

export const TIMING_BUCKETS: { id: TimingBucketId; label: string; min: number; max: number }[] = [
    { id: 'same-day', label: 'Same day', min: 0, max: 0 },
    { id: '1-3', label: '1–3 days', min: 1, max: 3 },
    { id: '4-7', label: '4–7 days', min: 4, max: 7 },
    { id: '8-30', label: '8–30 days', min: 8, max: 30 },
    { id: '30+', label: 'Over 30 days', min: 31, max: Number.POSITIVE_INFINITY },
]

export type TimingBucket = { id: TimingBucketId; label: string; referrals: number; share: number }

export type ConversionTiming = {
    /** Referrals converted in the period with a usable pair of timestamps. */
    converted: number
    avgDays: number | null
    medianDays: number | null
    buckets: TimingBucket[]
}

/** Days between creation and application, exactly as the referral list computes it. */
export function daysToConvert(referral: Pick<ReportReferralRow, 'created_at' | 'applied_at'>): number | null {
    if (!referral.applied_at) return null
    const days = daysBetweenInclusive({ from: istDate(referral.created_at), to: istDate(referral.applied_at) }) - 1
    return days < 0 ? null : days
}

/**
 * How long referrals converted in the period took, using the same
 * days-to-convert the list column shows. Referrals without an `applied_at`,
 * or applied before they were created, are left out rather than guessed.
 */
export function conversionTiming(referrals: ReportReferralRow[], range: DateRange): ConversionTiming {
    const days = referrals
        .filter((r) => r.applied_at !== null && inRange(istDate(r.applied_at), range))
        .map(daysToConvert)
        .filter((d): d is number => d !== null)
        .sort((a, b) => a - b)
    const converted = days.length
    const buckets = TIMING_BUCKETS.map((b) => {
        const count = days.filter((d) => d >= b.min && d <= b.max).length
        return { id: b.id, label: b.label, referrals: count, share: converted ? (count / converted) * 100 : 0 }
    })
    if (converted === 0) return { converted, avgDays: null, medianDays: null, buckets }
    const mid = Math.floor(converted / 2)
    return {
        converted,
        avgDays: days.reduce((s, d) => s + d, 0) / converted,
        medianDays: converted % 2 ? days[mid] : (days[mid - 1] + days[mid]) / 2,
        buckets,
    }
}

// ─── Referred-member revenue ─────────────────────────────────────────────────

export type ReferredRevenue = {
    /** Paid amount in the period from members who have a referrer on record. */
    revenue: number
    txns: number
    /** Distinct referred members with a paid payment in the period. */
    payingMembers: number
    avgPerPayingMember: number
    /** Every paid payment in the period, referred or not. */
    collected: number
    /** revenue ÷ collected, 0–100. */
    shareOfCollected: number
}

/**
 * Collections in the period from members whose record carries `referred_by`.
 * This is revenue associated with referred members — what they paid while in
 * the period — not revenue the referral caused; a referred member's third
 * renewal counts the same as their first payment.
 */
export function referredRevenue(payments: ReportPaymentRow[], members: ReportMemberRow[]): ReferredRevenue {
    const referred = new Set(members.filter((m) => m.referred_by !== null).map((m) => m.id))
    const paid = payments.filter((p) => p.payment_status === 'paid')
    const collected = paid.reduce((s, p) => s + p.amount, 0)
    const rows = paid.filter((p) => referred.has(p.member_id))
    const revenue = rows.reduce((s, p) => s + p.amount, 0)
    const payingMembers = new Set(rows.map((p) => p.member_id)).size
    return {
        revenue,
        txns: rows.length,
        payingMembers,
        avgPerPayingMember: payingMembers ? revenue / payingMembers : 0,
        collected,
        shareOfCollected: collected ? (revenue / collected) * 100 : 0,
    }
}

// ─── Referral share of new joins ─────────────────────────────────────────────

export type JoinMix = { joins: number; referred: number; share: number | null }

/** Members who joined in the range, and how many of them carry a referrer —
 *  the same join-date and source rule the Members report uses. */
export function joinMix(members: ReportMemberRow[], range: DateRange): JoinMix {
    const joined = members.filter((m) => inRange(istDate(m.created_at), range))
    const referred = joined.filter((m) => m.referred_by !== null).length
    return { joins: joined.length, referred, share: joined.length ? (referred / joined.length) * 100 : null }
}

export type JoinMixBucket = JoinMix & { start: string; label: string }

export function joinMixBuckets(members: ReportMemberRow[], range: DateRange, bucket: Bucket): JoinMixBucket[] {
    const acc = new Map<string, JoinMixBucket>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        acc.set(start, { start, label: bucketLabel(start, bucket), joins: 0, referred: 0, share: null })
    }
    for (const m of members) {
        const joined = istDate(m.created_at)
        if (!inRange(joined, range)) continue
        const target = acc.get(bucketStart(joined, bucket))
        if (!target) continue
        target.joins += 1
        if (m.referred_by !== null) target.referred += 1
    }
    return [...acc.values()].map((b) => ({ ...b, share: b.joins ? (b.referred / b.joins) * 100 : null }))
}

// ─── Referrer activity ───────────────────────────────────────────────────────

export type ReferrerSlice = { label: string; referrals: number; converted: number; conversion: number | null; isOther: boolean }

/**
 * The leaderboard rows as chart slices, the first `max` kept and the rest
 * folded into one "Other" slice so the chart stays readable while the table
 * below keeps every referrer. Same ordering as the leaderboard.
 */
export function referrerActivity(rows: LeaderRow[], max = 8): ReferrerSlice[] {
    const head = rows.slice(0, max).map((r) => ({
        label: r.member.full_name, referrals: r.referrals, converted: r.converted, conversion: r.conversion, isOther: false,
    }))
    const rest = rows.slice(max)
    if (rest.length === 0) return head
    const referrals = rest.reduce((s, r) => s + r.referrals, 0)
    const converted = rest.reduce((s, r) => s + r.converted, 0)
    return [...head, {
        label: `Other (${rest.length})`, referrals, converted, conversion: referrals ? (converted / referrals) * 100 : null, isOther: true,
    }]
}

export type LeaderboardTotals = { referrers: number; referrals: number; converted: number; conversion: number | null }

export function leaderboardTotals(rows: LeaderRow[]): LeaderboardTotals {
    const referrals = rows.reduce((s, r) => s + r.referrals, 0)
    const converted = rows.reduce((s, r) => s + r.converted, 0)
    return { referrers: rows.length, referrals, converted, conversion: referrals ? (converted / referrals) * 100 : null }
}

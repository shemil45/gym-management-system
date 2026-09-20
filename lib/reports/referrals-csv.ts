import { toCsv } from '@/lib/reports/csv'
import { istDate } from '@/lib/reports/members-aggregate'
import type { OverviewReport, LeaderboardReport, ListReport } from '@/lib/reports/referrals'

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100)

export function overviewCsv(report: Pick<OverviewReport, 'buckets'>): string {
    return toCsv(
        ['Bucket start', 'Period', 'Started', 'Leads', 'Converted', 'Pending', 'Expired', 'Cancelled', 'Conversion %', 'Coins issued', 'Coins redeemed', 'Value'],
        report.buckets.map((b) => [
            b.start, b.label, b.created, b.leads, b.converted, b.pending, b.expired, b.cancelled,
            round2(b.conversion), b.coinsIssued, b.coinsRedeemed, b.coinsRedeemed,
        ]),
    )
}

export function leaderboardCsv(report: Pick<LeaderboardReport, 'rows'>): string {
    return toCsv(
        ['Rank', 'Referrer', 'Referrer ID', 'Phone', 'Referrals', 'Converted', 'Conversion %', 'Coins earned', 'Balance'],
        report.rows.map((r, i) => [
            i + 1, r.member.full_name, r.member.member_code, r.member.phone,
            r.referrals, r.converted, round2(r.conversion), r.coinsEarned, r.balance,
        ]),
    )
}

export function listCsv(report: Pick<ListReport, 'rows'>): string {
    return toCsv(
        ['Date', 'Referrer', 'Referrer ID', 'Referred', 'Referred ID', 'Source', 'Status', 'Expires', 'Converted on', 'Days to convert'],
        report.rows.map((r) => [
            istDate(r.created_at), r.referrer_name, r.referrer_code, r.referred_name, r.referred_code,
            r.source, r.status, r.expires_at ? istDate(r.expires_at) : null, r.applied_at ? istDate(r.applied_at) : null, r.daysToConvert,
        ]),
    )
}

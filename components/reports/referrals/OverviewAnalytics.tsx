import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { OverviewReport } from '@/lib/reports/referrals'
import type { ReferrerSlice } from '@/lib/reports/referrals-aggregate'
import { overviewInsight } from '@/lib/reports/referrals-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'
import InsightBar from '@/components/reports/InsightBar'
import ReferralTrend from '@/components/reports/referrals/ReferralTrend'
import ConversionFunnel from '@/components/reports/referrals/ConversionFunnel'

/**
 * Trend → Created / Converted and conversion timing → activity by referrer →
 * referred-member figures → one insight, then the existing overview table.
 * Every number reads `OverviewReport`, built from the same rows as the table.
 */
/** Says exactly who the referrer chart covers — everyone, or the largest few with the rest grouped. */
function referrerScope(total: number, activity: ReferrerSlice[]): string {
    const shown = activity.filter((a) => !a.isOther).length
    const grouped = total - shown
    return grouped > 0
        ? `Referrals created this period · Showing ${shown} of ${total} referrers by referral count; ${grouped} grouped as Other. The Leaderboard tab lists everyone.`
        : `Referrals created this period, by the member who referred · All ${total} referrer${total === 1 ? '' : 's'} shown`
}

export default function OverviewAnalytics({ report }: { report: OverviewReport }) {
    const { funnel, timing, activity, referrers, referred, previousReferred, joinMix, previousJoinMix } = report
    const suffix = comparisonSuffix(report.compare)
    const delta = (current: number | null, prev: number | null | undefined): Pick<KpiCardProps, 'delta'> =>
        current === null || prev === null || prev === undefined ? {} : { delta: { current, previous: prev, suffix } }
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

    return (
        <>
            <ReferralTrend buckets={report.buckets} comparisonBuckets={report.comparisonBuckets} compare={report.compare} />

            <div className="grid gap-4 lg:grid-cols-2">
                <ConversionFunnel funnel={funnel} />
                <ShareChart
                    title="Time to conversion"
                    subtitle={timing.converted > 0
                        ? `${plural(timing.converted, 'conversion', 'conversions')} this period · average ${timing.avgDays?.toFixed(1)} days · median ${timing.medianDays?.toFixed(0)} days`
                        : 'Days between a referral being created and applied'}
                    format="number"
                    order="given"
                    data={timing.buckets.map((b) => ({ label: b.label, value: b.referrals, detail: 'referrals' }))}
                    emptyMessage="No conversions in this period"
                />
            </div>

            <ShareChart
                title="Referral activity by referrer"
                subtitle={referrerScope(referrers.length, activity)}
                format="number"
                data={activity.map((a) => ({
                    label: a.label, value: a.referrals,
                    detail: `${a.converted} converted${a.conversion !== null ? ` · ${a.conversion.toFixed(0)}% conversion` : ''}`,
                }))}
                emptyMessage="No referrals in this period"
            />

            <KpiStrip
                columns={4}
                items={[
                    {
                        label: 'Revenue from referred members',
                        value: formatCurrency(referred.revenue),
                        description: `${referred.shareOfCollected.toFixed(1)}% of ${formatCurrency(referred.collected)} collected · paid by members with a referrer on record`,
                        ...delta(referred.revenue, previousReferred?.revenue),
                    },
                    { label: 'Referred members who paid', value: String(referred.payingMembers), description: plural(referred.txns, 'payment', 'payments'), ...delta(referred.payingMembers, previousReferred?.payingMembers) },
                    { label: 'Avg per referred paying member', value: formatCurrency(referred.avgPerPayingMember), ...delta(referred.avgPerPayingMember, previousReferred?.avgPerPayingMember) },
                    {
                        label: 'Referral share of new joins',
                        value: joinMix.share === null ? '—' : `${joinMix.share.toFixed(1)}%`,
                        description: joinMix.joins > 0 ? `${joinMix.referred} of ${plural(joinMix.joins, 'new join', 'new joins')} had a referrer` : 'No new joins in this period',
                        ...delta(joinMix.share, previousJoinMix?.share),
                    },
                ]}
            />

            <InsightBar insight={overviewInsight(report)} />
        </>
    )
}

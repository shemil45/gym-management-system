import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { OverviewReport } from '@/lib/reports/referrals'
import { overviewInsight } from '@/lib/reports/referrals-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'
import InsightBar from '@/components/reports/InsightBar'
import ReferralTrend from '@/components/reports/referrals/ReferralTrend'

/**
 * Trend → Created / Converted and conversion timing → activity by referrer →
 * referred-member figures → one insight, then the existing overview table.
 * Every number reads `OverviewReport`, built from the same rows as the table.
 */
export default function OverviewAnalytics({ report }: { report: OverviewReport }) {
    const { funnel, timing, activity, referred, previousReferred, joinMix, previousJoinMix } = report
    const suffix = comparisonSuffix(report.compare)
    const delta = (current: number | null, prev: number | null | undefined): Pick<KpiCardProps, 'delta'> =>
        current === null || prev === null || prev === undefined ? {} : { delta: { current, previous: prev, suffix } }
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

    return (
        <>
            <ReferralTrend buckets={report.buckets} comparisonBuckets={report.comparisonBuckets} compare={report.compare} />

            <div className="grid gap-4 lg:grid-cols-2">
                <ShareChart
                    title="Created → converted"
                    subtitle={`Referrals created this period and how many converted. Each conversion credits ${funnel.bonus} coins, so ${funnel.coinsIssued} coins were issued — a derived figure, not a reward ledger.`}
                    format="number"
                    order="given"
                    data={[
                        { label: 'Created', value: funnel.created, detail: 'referrals' },
                        { label: 'Converted', value: funnel.converted, detail: 'applied' },
                    ]}
                    emptyMessage="No referrals created in this period"
                />
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
                subtitle={activity.some((a) => a.isOther) ? 'Referrals created this period; the largest referrers shown, the rest combined. The Leaderboard tab lists everyone.' : 'Referrals created this period, by the member who referred'}
                format="number"
                data={activity.map((a) => ({
                    label: a.label, value: a.referrals,
                    detail: `${a.converted} converted${a.conversion !== null ? ` · ${a.conversion.toFixed(0)}%` : ''}`,
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

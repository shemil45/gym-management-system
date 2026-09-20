import type { LeaderboardReport } from '@/lib/reports/referrals'
import { leaderboardInsight } from '@/lib/reports/referrals-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

/**
 * Totals → conversions by referrer → one insight, then the full table. The
 * chart shows the largest referrers with the rest folded into "Other" so it
 * stays readable; the table keeps every row. Activity counts only — there is
 * no score and no "top" or "best" anywhere on this tab.
 */
export default function LeaderboardAnalytics({ report }: { report: LeaderboardReport }) {
    const { totals, activity } = report
    return (
        <>
            <KpiStrip
                columns={4}
                items={[
                    { label: 'Referrers', value: String(totals.referrers), description: 'Members with a referral this period' },
                    { label: 'Referrals', value: String(totals.referrals) },
                    { label: 'Converted', value: String(totals.converted), description: 'Of those referrals, registered so far' },
                    { label: 'Conversion rate', value: totals.conversion === null ? '—' : `${totals.conversion.toFixed(1)}%`, description: 'Converted ÷ referrals' },
                ]}
            />
            <ShareChart
                title="Conversions by referrer"
                subtitle={activity.some((a) => a.isOther) ? 'Converted referrals per referrer; the largest shown, the rest combined. Every referrer is in the table below.' : 'Converted referrals per referrer'}
                format="number"
                data={activity.map((a) => ({ label: a.label, value: a.converted, detail: `of ${a.referrals} referral${a.referrals === 1 ? '' : 's'}` }))}
                emptyMessage="No conversions in this period"
            />
            <InsightBar insight={leaderboardInsight(report)} />
        </>
    )
}

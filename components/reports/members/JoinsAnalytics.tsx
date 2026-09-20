import type { JoinsReport } from '@/lib/reports/members'
import { joinsInsight } from '@/lib/reports/members-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import InsightBar from '@/components/reports/InsightBar'
import GrowthTrend from '@/components/reports/members/GrowthTrend'

/**
 * The growth view: trend → source split → one insight, then the joins table.
 * Source is the existing referral / walk-in classification — the only
 * acquisition distinction the data supports.
 */
export default function JoinsAnalytics({ report }: { report: JoinsReport }) {
    const { summary } = report
    return (
        <>
            <GrowthTrend buckets={report.buckets} comparisonBuckets={report.comparisonBuckets} compare={report.compare} />
            <ShareChart
                title="Referral vs walk-in"
                subtitle="How new members in this period were sourced"
                format="number"
                data={[
                    { label: 'Referral', value: summary.referral, detail: 'referred by an existing member' },
                    { label: 'Walk-in', value: summary.walkIn, detail: 'no referrer recorded' },
                ]}
                height={120}
                emptyMessage="No new joins in this period"
            />
            <InsightBar insight={joinsInsight(report)} />
        </>
    )
}

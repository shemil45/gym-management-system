import { formatCurrency } from '@/lib/utils/currency'
import type { RetentionReport } from '@/lib/reports/members'
import { retentionInsight } from '@/lib/reports/members-insights'
import TrendChart from '@/components/reports/charts/TrendChart'
import StackedBarChart from '@/components/reports/charts/StackedBarChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'
import CohortTable from '@/components/reports/members/CohortTable'

const COMPARISON_LABEL = { none: '', previous: 'Previous period', 'last-year': 'Last year' } as const

/**
 * Retention trend → renewed / churned / reactivated per period → total paid
 * per member → cohorts → one insight. Every figure comes from the windows
 * the Retention tab already computed; the trend and breakdown are the same
 * `retentionBuckets()` the table below renders.
 */
export default function RetentionAnalytics({ report }: { report: RetentionReport }) {
    const { buckets, comparisonBuckets, reactivations, paid, cohorts } = report
    const byStart = new Map(reactivations.map((r) => [r.start, r.reactivated]))

    return (
        <>
            <TrendChart
                title="Retention"
                subtitle={comparisonBuckets ? `Renewed ÷ ended per period. Dashed line: ${COMPARISON_LABEL[report.compare].toLowerCase()}` : 'Renewed ÷ ended per period'}
                data={buckets.map((b, i) => ({ label: b.label, retention: b.retention, comparison: comparisonBuckets?.[i]?.retention ?? null }))}
                xKey="label"
                series={[
                    { key: 'retention', label: 'This period' },
                    ...(comparisonBuckets ? [{ key: 'comparison', label: COMPARISON_LABEL[report.compare], comparison: true }] : []),
                ]}
                format="percent"
                height={240}
                emptyMessage="No membership windows ended in this period"
            />

            <StackedBarChart
                title="Renewed, churned and reactivated"
                subtitle="Renewed + churned = memberships that ended in the period; reactivated are memberships that resumed after a 30+ day lapse"
                data={buckets.map((b) => ({ label: b.label, renewed: b.renewed, churned: b.churned, reactivated: byStart.get(b.start) ?? 0 }))}
                xKey="label"
                series={[{ key: 'renewed', label: 'Renewed' }, { key: 'churned', label: 'Churned' }, { key: 'reactivated', label: 'Reactivated' }]}
                stacked={false}
                format="number"
                height={220}
                emptyMessage="No membership windows ended or resumed in this period"
            />

            <KpiStrip
                columns={3}
                items={[
                    {
                        label: 'Avg total paid per member',
                        value: paid ? formatCurrency(paid.average) : '—',
                        description: paid ? `Total recorded payments attributed to each member, averaged over ${paid.members} paying members` : 'No recorded payments',
                    },
                    {
                        label: 'Median total paid',
                        value: paid ? formatCurrency(paid.median) : '—',
                        description: 'Half of paying members have paid less than this in total',
                    },
                    {
                        label: 'Paying members',
                        value: paid ? String(paid.members) : '0',
                        description: 'Members with at least one recorded payment, all time',
                    },
                ]}
            />

            <CohortTable cohorts={cohorts} />

            <InsightBar insight={retentionInsight(report)} />
        </>
    )
}

import { formatCurrency } from '@/lib/utils/currency'
import type { SummaryReport } from '@/lib/reports/payments'
import { membershipInsight, summaryInsight } from '@/lib/reports/payments-insights'
import { firstInsight } from '@/lib/reports/insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'
import RevenueTrend from '@/components/reports/payments/RevenueTrend'

/**
 * The analytical layer of the Summary tab, between the KPI row and the
 * detailed table: trend → method / membership split → per-member figures →
 * one insight. Every number here is read off `SummaryReport`, which was
 * derived from the same rows as the table.
 */
export default function SummaryAnalytics({ report }: { report: SummaryReport }) {
    const { methods, membership, perMember, concentration } = report
    const txns = (n: number) => `${n} txn${n === 1 ? '' : 's'}`

    return (
        <>
            <RevenueTrend buckets={report.buckets} comparisonBuckets={report.comparisonBuckets} compare={report.compare} />

            <div className="grid gap-4 lg:grid-cols-2">
                <ShareChart
                    title="Payment methods"
                    subtitle="Collected amount by method"
                    format="currency"
                    data={methods.map((m) => ({ label: m.label, value: m.amount, detail: txns(m.txns) }))}
                    emptyMessage="No payments in this period"
                />
                <ShareChart
                    title="New vs renewal"
                    subtitle="Collected amount by membership type"
                    format="currency"
                    data={membership.map((k) => ({ label: k.label, value: k.amount, detail: txns(k.txns) }))}
                    emptyMessage="No payments in this period"
                />
            </div>

            <KpiStrip
                columns={2}
                items={[
                    {
                        label: 'Revenue per paying member',
                        value: formatCurrency(perMember.revenuePerMember),
                        description: perMember.members > 0
                            ? `Collected ÷ ${perMember.members} member${perMember.members === 1 ? '' : 's'} who paid this period`
                            : 'No paying members this period',
                    },
                    {
                        label: 'Revenue concentration',
                        value: concentration ? `${concentration.revenueShare.toFixed(1)}%` : '—',
                        description: concentration
                            ? `of collected revenue came from the top ${Math.round(concentration.topFraction * 100)}% of paying members (${concentration.topMembers} of ${concentration.members})`
                            : 'Shown once ten or more members have paid in the period',
                    },
                ]}
            />

            <InsightBar insight={firstInsight(summaryInsight(report), membershipInsight(report))} />
        </>
    )
}

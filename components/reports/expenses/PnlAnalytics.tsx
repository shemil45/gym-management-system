import { formatCurrency } from '@/lib/utils/currency'
import type { PnlReport } from '@/lib/reports/expenses'
import { pnlInsight } from '@/lib/reports/expenses-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'
import PnlTrend from '@/components/reports/expenses/PnlTrend'

/**
 * The analytical layer of the P&L tab: revenue vs expenses trend → expense
 * composition → cost per member / month-end projection → one insight. All of
 * it reads `PnlReport`, which came from the same rows as the table below.
 */
export default function PnlAnalytics({ report }: { report: PnlReport }) {
    const { categories, kpis, activeMembers, costPerActiveMember, runRate } = report
    const entries = (n: number) => `${n} entr${n === 1 ? 'y' : 'ies'}`

    return (
        <>
            <PnlTrend buckets={report.buckets} comparisonBuckets={report.comparisonBuckets} compare={report.compare} />

            <ShareChart
                title="Expense composition"
                subtitle="Recorded expenses by category, largest first"
                format="currency"
                data={categories.filter((c) => c.entries > 0).map((c) => ({ label: c.label, value: c.total, detail: `${entries(c.entries)} · avg ${formatCurrency(c.avg)}` }))}
                emptyMessage="No expenses in this period"
            />

            <KpiStrip
                columns={2}
                items={[
                    {
                        label: 'Cost per active member',
                        value: costPerActiveMember === null ? '—' : formatCurrency(costPerActiveMember),
                        description: activeMembers === null
                            ? 'Active member count unavailable'
                            : activeMembers === 0
                                ? 'No active members today'
                                : `${formatCurrency(kpis.totalExpenses)} ÷ ${activeMembers} active member${activeMembers === 1 ? '' : 's'} as of today`,
                    },
                    // Only for the current month to date; any other range gets no card.
                    ...(runRate ? [{
                        label: 'Projected month-end expense',
                        value: formatCurrency(runRate.projected),
                        description: `${formatCurrency(runRate.recorded)} recorded over ${runRate.elapsedDays} of ${runRate.daysInMonth} days, continued at the same daily pace`,
                    }] : []),
                ]}
            />

            <InsightBar insight={pnlInsight(report)} />
        </>
    )
}

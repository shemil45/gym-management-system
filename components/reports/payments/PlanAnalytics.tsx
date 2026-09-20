import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { PlanReport } from '@/lib/reports/payments'
import { planInsight } from '@/lib/reports/payments-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

/** KPI → chart → insight for the By plan tab; the table follows separately. */
export default function PlanAnalytics({ report }: { report: PlanReport }) {
    const { total, previousTotal } = report
    const suffix = comparisonSuffix(report.compare)
    const avg = total.txns ? total.revenue / total.txns : 0
    const prevAvg = previousTotal && previousTotal.txns ? previousTotal.revenue / previousTotal.txns : null

    return (
        <>
            <KpiStrip
                columns={3}
                items={[
                    { label: 'Plan revenue', value: formatCurrency(total.revenue), ...(previousTotal ? { delta: { current: total.revenue, previous: previousTotal.revenue, suffix } } : {}) },
                    { label: 'Transactions', value: String(total.txns), ...(previousTotal ? { delta: { current: total.txns, previous: previousTotal.txns, suffix } } : {}) },
                    { label: 'Avg transaction', value: formatCurrency(avg), ...(prevAvg !== null ? { delta: { current: avg, previous: prevAvg, suffix } } : {}) },
                ]}
            />
            <ShareChart
                title="Revenue by plan"
                subtitle="Collected amount per plan, largest first"
                format="currency"
                data={report.rows.map((row) => ({ label: row.plan, value: row.revenue, detail: `${row.txns} txn${row.txns === 1 ? '' : 's'} · avg ${formatCurrency(row.avgTicket)}` }))}
                emptyMessage="No payments in this period"
            />
            <InsightBar insight={planInsight(report)} />
        </>
    )
}

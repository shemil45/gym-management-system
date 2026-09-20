import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { CategoryReport } from '@/lib/reports/expenses'
import { categoryInsight } from '@/lib/reports/expenses-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

/** KPI → composition chart → insight for the By category tab; the table follows. */
export default function CategoryAnalytics({ report }: { report: CategoryReport }) {
    const { rows, total, previousTotal } = report
    const suffix = comparisonSuffix(report.compare)
    const entries = rows.reduce((s, r) => s + r.entries, 0)
    const avg = entries ? total / entries : 0
    const compared = previousTotal !== null
    const label = (n: number) => `${n} entr${n === 1 ? 'y' : 'ies'}`

    return (
        <>
            <KpiStrip
                columns={3}
                items={[
                    { label: 'Total expenses', value: formatCurrency(total), ...(compared ? { delta: { current: total, previous: previousTotal, invert: true, suffix } } : {}) },
                    { label: 'Entries', value: String(entries) },
                    { label: 'Avg per entry', value: formatCurrency(avg) },
                ]}
            />
            <ShareChart
                title="Expenses by category"
                subtitle="Recorded amount per category, largest first"
                format="currency"
                data={rows.filter((r) => r.entries > 0).map((r) => ({ label: r.label, value: r.total, detail: `${label(r.entries)} · avg ${formatCurrency(r.avg)}` }))}
                emptyMessage="No expenses in this period"
            />
            <InsightBar insight={categoryInsight(report)} />
        </>
    )
}

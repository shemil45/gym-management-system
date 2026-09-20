import { formatCurrency } from '@/lib/utils/currency'
import { METHOD_LABELS, PAYMENT_METHODS } from '@/lib/reports/payments-aggregate'
import type { StaffReport } from '@/lib/reports/payments'
import { staffInsight } from '@/lib/reports/payments-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import StackedBarChart from '@/components/reports/charts/StackedBarChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

/**
 * KPI → charts → insight for the By staff tab. Deliberately factual: who
 * collected what, by which method, and how much has no collector recorded.
 * There is no ranking, score or "top performer" here and there should not be —
 * collections reflect shift patterns and who was at the desk, not effort.
 *
 * "Unassigned" is a data-quality figure: paid rows with no `processed_by`.
 * Self-service portal payments are already labelled separately and are not
 * counted in it.
 */
export default function StaffAnalytics({ report }: { report: StaffReport }) {
    const { total, unassigned, methods, rows } = report
    const txns = (n: number) => `${n} txn${n === 1 ? '' : 's'}`

    return (
        <>
            <KpiStrip
                columns={4}
                items={[
                    { label: 'Collected', value: formatCurrency(total.collected), description: txns(total.txns) },
                    { label: 'Cash handled', value: formatCurrency(total.cash), description: total.collected ? `${((total.cash / total.collected) * 100).toFixed(1)}% of collected` : undefined },
                    { label: 'Collectors', value: String(rows.filter((row) => row.staff !== 'Unassigned').length), description: 'people or channels with payments recorded' },
                    {
                        label: 'Unassigned',
                        value: formatCurrency(unassigned.amount),
                        description: unassigned.txns > 0 ? `${txns(unassigned.txns)} with no collector recorded` : 'Every payment has a collector recorded',
                        tone: unassigned.txns > 0 ? 'negative' : 'positive',
                    },
                ]}
            />

            <div className="grid gap-4 lg:grid-cols-2">
                <ShareChart
                    title="Collections by collector"
                    subtitle="Collected amount, in the same order as the table"
                    format="currency"
                    data={rows.map((row) => ({ label: row.staff, value: row.collected, detail: txns(row.txns) }))}
                    emptyMessage="No payments in this period"
                />
                <StackedBarChart
                    title="Payment methods by collector"
                    subtitle="How each collector's total splits by method"
                    data={methods.map((row) => ({ staff: row.staff, ...row.byMethod }))}
                    xKey="staff"
                    series={PAYMENT_METHODS.map((method) => ({ key: method, label: METHOD_LABELS[method] }))}
                    format="currency"
                    emptyMessage="No payments in this period"
                />
            </div>

            <InsightBar insight={staffInsight(report)} />
        </>
    )
}

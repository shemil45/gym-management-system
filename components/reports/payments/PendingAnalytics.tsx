import { formatCurrency } from '@/lib/utils/currency'
import type { PendingReport } from '@/lib/reports/payments'
import { pendingInsight } from '@/lib/reports/payments-insights'
import StackedBarChart from '@/components/reports/charts/StackedBarChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

/**
 * KPI → ageing chart → insight for the Pending tab. Ageing is by the date each
 * payment was *recorded* (`created_at`, IST), which is the only timestamp
 * that says how long the entry has actually been sitting unresolved.
 */
export default function PendingAnalytics({ report }: { report: PendingReport }) {
    const { split, ageing } = report
    const pendingAmount = split.pending.reduce((s, r) => s + r.amount, 0)
    const failedAmount = split.failed.reduce((s, r) => s + r.amount, 0)
    const old = ageing.find((b) => b.id === '8+')
    const oldAmount = old ? old.pendingAmount + old.failedAmount : 0
    const oldCount = old ? old.pendingCount + old.failedCount : 0
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

    return (
        <>
            <KpiStrip
                columns={3}
                items={[
                    { label: 'Pending', value: formatCurrency(pendingAmount), description: plural(split.pending.length, 'payment', 'payments'), tone: pendingAmount > 0 ? 'default' : 'positive' },
                    { label: 'Failed', value: formatCurrency(failedAmount), description: plural(split.failed.length, 'payment', 'payments'), tone: failedAmount > 0 ? 'negative' : 'positive' },
                    { label: 'Over 7 days old', value: formatCurrency(oldAmount), description: plural(oldCount, 'payment', 'payments'), tone: oldAmount > 0 ? 'negative' : 'positive' },
                ]}
            />
            <StackedBarChart
                title="Ageing of unresolved payments"
                subtitle="Amount by days since the payment was recorded"
                data={ageing.map((b) => ({ label: b.label, pending: b.pendingAmount, failed: b.failedAmount }))}
                xKey="label"
                series={[{ key: 'pending', label: 'Pending' }, { key: 'failed', label: 'Failed' }]}
                format="currency"
                height={180}
                emptyMessage="Nothing unresolved in this period"
            />
            <InsightBar insight={pendingInsight(report)} />
        </>
    )
}

import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { SummaryReport } from '@/lib/reports/payments'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'

/**
 * The six Summary KPIs. Collected / Transactions / Avg ticket are the original
 * three, unchanged in meaning (paid rows only). The other three come from
 * `statusKpis` over the same rows.
 */
export default function PaymentsKpiStrip({ report }: { report: SummaryReport }) {
    const { kpis, previous, status, previousStatus } = report
    const suffix = comparisonSuffix(report.compare)

    // With comparison off there is no basis, so the cards carry no delta.
    const delta = (current: number, prev: number | null | undefined, invert?: boolean): Pick<KpiCardProps, 'delta'> =>
        prev === null || prev === undefined ? {} : { delta: { current, previous: prev, invert, suffix } }

    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

    return (
        <KpiStrip
            columns={6}
            items={[
                { label: 'Total collected', value: formatCurrency(kpis.collected), ...delta(kpis.collected, previous?.collected) },
                { label: 'Transactions', value: String(kpis.txns), ...delta(kpis.txns, previous?.txns) },
                { label: 'Avg ticket', value: formatCurrency(kpis.avgTicket), ...delta(kpis.avgTicket, previous?.avgTicket) },
                {
                    label: 'Successful payments',
                    value: status.successRate === null ? '—' : `${status.successRate.toFixed(1)}%`,
                    description: `${status.successful} of ${plural(status.attempts, 'attempt', 'attempts')}`,
                    ...(status.successRate !== null && previousStatus?.successRate !== null && previousStatus?.successRate !== undefined
                        ? delta(status.successRate, previousStatus.successRate)
                        : {}),
                },
                {
                    label: 'Failed payments',
                    value: String(status.failed),
                    description: status.failed > 0 ? formatCurrency(status.failedAmount) : undefined,
                    ...delta(status.failed, previousStatus?.failed, true),
                },
                {
                    label: 'Pending amount',
                    value: formatCurrency(status.pendingAmount),
                    description: status.pending > 0 ? plural(status.pending, 'payment', 'payments') : undefined,
                    ...delta(status.pendingAmount, previousStatus?.pendingAmount, true),
                },
            ]}
        />
    )
}

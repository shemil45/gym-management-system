import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { JoinsReport } from '@/lib/reports/members'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'

/**
 * New joins / Referral share keep their original meaning (`joinKpis`); the
 * other three come from `joinSummary` over the same rows.
 */
export default function JoinsKpis({ report }: { report: JoinsReport }) {
    const { summary, previousSummary } = report
    const suffix = comparisonSuffix(report.compare)
    const delta = (current: number | null, prev: number | null | undefined): Pick<KpiCardProps, 'delta'> =>
        current === null || prev === null || prev === undefined ? {} : { delta: { current, previous: prev, suffix } }

    return (
        <KpiStrip
            columns={5}
            items={[
                { label: 'New joins', value: String(summary.joins), ...delta(summary.joins, previousSummary?.joins) },
                { label: 'Referral joins', value: String(summary.referral), ...delta(summary.referral, previousSummary?.referral) },
                { label: 'Walk-in joins', value: String(summary.walkIn), ...delta(summary.walkIn, previousSummary?.walkIn) },
                { label: 'Referral share', value: `${summary.referralShare.toFixed(1)}%`, ...delta(summary.referralShare, previousSummary?.referralShare) },
                {
                    label: 'Avg first payment',
                    value: summary.avgFirstPayment === null ? '—' : formatCurrency(summary.avgFirstPayment),
                    description: summary.withFirstPayment > 0 ? `over ${summary.withFirstPayment} of ${summary.joins} with a payment` : 'No first payments yet',
                    ...delta(summary.avgFirstPayment, previousSummary?.avgFirstPayment),
                },
            ]}
        />
    )
}

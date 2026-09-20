import { comparisonSuffix } from '@/lib/reports/comparison'
import type { OverviewReport } from '@/lib/reports/referrals'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'

/**
 * Created / Conversions / Coins issued / Coins redeemed / Outstanding keep
 * their original meaning. Coins issued is derived (conversions × bonus) —
 * the card says so — while coins redeemed and the outstanding balance are
 * actual figures. Conversion rate is conversions ÷ referrals created.
 */
export default function OverviewKpis({ report }: { report: OverviewReport }) {
    const { kpis, previous, outstanding, bonus } = report
    const suffix = comparisonSuffix(report.compare)
    const delta = (current: number | null, prev: number | null | undefined, invert?: boolean): Pick<KpiCardProps, 'delta'> =>
        current === null || prev === null || prev === undefined ? {} : { delta: { current, previous: prev, invert, suffix } }

    const rate = kpis.referrals ? (kpis.conversions / kpis.referrals) * 100 : null
    const previousRate = previous ? (previous.referrals ? (previous.conversions / previous.referrals) * 100 : null) : undefined

    return (
        <KpiStrip
            columns={6}
            items={[
                { label: 'Referrals created', value: String(kpis.referrals), ...delta(kpis.referrals, previous?.referrals) },
                { label: 'Converted', value: String(kpis.conversions), description: 'Applied in this period', ...delta(kpis.conversions, previous?.conversions) },
                { label: 'Conversion rate', value: rate === null ? '—' : `${rate.toFixed(1)}%`, description: 'Converted ÷ created', ...delta(rate, previousRate) },
                { label: 'Coins issued', value: String(kpis.coinsIssued), description: `Derived: conversions × ${bonus}`, ...delta(kpis.coinsIssued, previous?.coinsIssued) },
                { label: 'Coins redeemed', value: String(kpis.coinsRedeemed), description: 'Used against paid payments', ...delta(kpis.coinsRedeemed, previous?.coinsRedeemed) },
                // A balance is a point-in-time figure, not a period total, so it carries no delta.
                { label: 'Outstanding coin balance', value: String(outstanding), note: 'Sum of member balances, as of today' },
            ]}
        />
    )
}

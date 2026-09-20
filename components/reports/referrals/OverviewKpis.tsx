import { comparisonSuffix } from '@/lib/reports/comparison'
import type { OverviewReport } from '@/lib/reports/referrals'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'

/**
 * Referrals started / Converted / Conversion rate / Pending / Coins issued /
 * Outstanding. "Started" counts referrals the referred person actually
 * began (a lead submitted through a share link, or one recorded at the
 * desk) — never links generated, which are shown in the funnel instead.
 * Coins issued is derived (conversions × bonus) — the card says so — while
 * the outstanding balance is an actual figure.
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
                { label: 'Referrals started', value: String(kpis.referrals), description: `${kpis.leads} via share link · ${kpis.referrals - kpis.leads} at the desk`, ...delta(kpis.referrals, previous?.referrals) },
                { label: 'Converted', value: String(kpis.conversions), description: 'Registered in this period', ...delta(kpis.conversions, previous?.conversions) },
                { label: 'Conversion rate', value: rate === null ? '—' : `${rate.toFixed(1)}%`, description: 'Converted ÷ started', ...delta(rate, previousRate) },
                { label: 'Pending leads', value: String(kpis.pending), description: `${kpis.expired} expired · ${kpis.cancelled} cancelled`, ...delta(kpis.pending, previous?.pending, true) },
                { label: 'Coins issued', value: String(kpis.coinsIssued), description: `Derived: conversions × ${bonus}`, ...delta(kpis.coinsIssued, previous?.coinsIssued) },
                // A balance is a point-in-time figure, not a period total, so it carries no delta.
                { label: 'Outstanding coin balance', value: String(outstanding), note: 'Sum of member balances, as of today' },
            ]}
        />
    )
}

import { formatCurrency } from '@/lib/utils/currency'
import { STATUS_LABELS, type EffectiveStatus } from '@/lib/reports/members-aggregate'
import type { RosterReport } from '@/lib/reports/members'
import { rosterInsight } from '@/lib/reports/members-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

const ORDER: EffectiveStatus[] = ['active', 'expiring', 'expired', 'frozen', 'inactive']

/**
 * Membership value → status and plan distribution as charts → one insight.
 * Statuses are the existing `effectiveStatus`; MRR is Σ members × the plan
 * distribution's own normalised monthly value, and is labelled as membership
 * value — it is not recognised revenue and excludes admission fees.
 */
export default function RosterAnalytics({ report }: { report: RosterReport }) {
    const { counts, plans, value } = report
    return (
        <>
            <KpiStrip
                columns={3}
                items={[
                    { label: 'Active memberships', value: String(value.members), description: 'Active or expiring, on a plan' },
                    { label: 'MRR', value: formatCurrency(value.mrr), description: 'Normalised monthly plan value of the active membership base' },
                    { label: 'ARR', value: formatCurrency(value.arr), description: 'MRR × 12' },
                ]}
            />
            <div className="grid gap-4 lg:grid-cols-2">
                <ShareChart
                    title="Status distribution"
                    subtitle={`${counts.total} members by effective status`}
                    format="number"
                    data={ORDER.map((status) => ({ label: STATUS_LABELS[status], value: counts[status] }))}
                    emptyMessage="No members"
                />
                <ShareChart
                    title="Plan distribution"
                    subtitle="Active and expiring members by plan"
                    format="number"
                    data={plans.map((p) => ({ label: p.plan, value: p.members, detail: `${formatCurrency(p.price)} · ${p.durationDays}d · ${formatCurrency(p.monthlyValue)}/mo` }))}
                    emptyMessage="No active or expiring members"
                />
            </div>
            <InsightBar insight={rosterInsight(report)} />
        </>
    )
}

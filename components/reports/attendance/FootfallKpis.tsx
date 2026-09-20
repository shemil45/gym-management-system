import { comparisonSuffix } from '@/lib/reports/comparison'
import { formatHourLabel } from '@/lib/reports/attendance-aggregate'
import type { FootfallReport } from '@/lib/reports/attendance'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'

/**
 * Visits / Unique members / Per day keep their original meaning. Visits per
 * member, peak hour and average duration are read off the same totals the
 * table shows; duration is explicit about being an average over visits that
 * have a check-out, because most do not.
 */
export default function FootfallKpis({ report }: { report: FootfallReport }) {
    const { kpis, previous, totals, peaks, previousPeaks, withDuration } = report
    const suffix = comparisonSuffix(report.compare)
    const delta = (current: number | null, prev: number | null | undefined): Pick<KpiCardProps, 'delta'> =>
        current === null || prev === null || prev === undefined ? {} : { delta: { current, previous: prev, suffix } }

    const perMember = kpis.uniqueMembers ? kpis.visits / kpis.uniqueMembers : 0
    const prevPerMember = previous ? (previous.uniqueMembers ? previous.visits / previous.uniqueMembers : 0) : undefined

    return (
        <KpiStrip
            columns={6}
            items={[
                { label: 'Total visits', value: String(kpis.visits), ...delta(kpis.visits, previous?.visits) },
                { label: 'Unique members', value: String(kpis.uniqueMembers), ...delta(kpis.uniqueMembers, previous?.uniqueMembers) },
                { label: 'Avg visits / day', value: kpis.perDay.toFixed(1), ...delta(kpis.perDay, previous?.perDay) },
                { label: 'Visits per member', value: perMember.toFixed(1), ...delta(perMember, prevPerMember) },
                {
                    label: 'Peak hour',
                    value: peaks.busiestHour ? formatHourLabel(peaks.busiestHour.hour) : '—',
                    description: peaks.busiestHour ? `${peaks.busiestHour.visits} visits` : undefined,
                    note: previousPeaks?.busiestHour ? `${suffix}: ${formatHourLabel(previousPeaks.busiestHour.hour)}` : undefined,
                },
                {
                    label: 'Avg visit duration',
                    value: totals.avgMinutes === null ? '—' : `${Math.round(totals.avgMinutes)} min`,
                    description: withDuration > 0
                        ? `Based on ${withDuration} of ${kpis.visits} visits with a recorded check-out`
                        : 'No visits have a recorded check-out',
                },
            ]}
        />
    )
}

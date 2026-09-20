import { comparisonSuffix } from '@/lib/reports/comparison'
import type { RetentionReport } from '@/lib/reports/members'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'

/** Retention / Ended / Renewed / Churned are the existing totals; Reactivated
 *  is the count of windows in the period that resumed after a lapse. */
export default function RetentionKpis({ report }: { report: RetentionReport }) {
    const { totals, previous } = report
    const suffix = comparisonSuffix(report.compare)
    // Retention is null when nothing ended; a delta against an unknown is
    // meaningless, so those cards show a dash instead.
    const compare = (cur: number | null, prev: number | null | undefined, invert?: boolean): Pick<KpiCardProps, 'delta' | 'note'> =>
        prev === undefined ? {} : cur === null || prev === null ? { note: '—' } : { delta: { current: cur, previous: prev, invert, suffix } }

    return (
        <KpiStrip
            columns={5}
            items={[
                { label: 'Retention', value: totals.retention === null ? '—' : `${totals.retention.toFixed(1)}%`, description: 'Renewed ÷ ended', ...compare(totals.retention, previous ? previous.retention : undefined) },
                { label: 'Ended', value: String(totals.ended), ...compare(totals.ended, previous ? previous.ended : undefined, true) },
                { label: 'Renewed', value: String(totals.renewed), description: 'Within 30 days of ending', ...compare(totals.renewed, previous ? previous.renewed : undefined) },
                { label: 'Churned', value: String(totals.churned), description: 'Ended, not renewed', ...compare(totals.churned, previous ? previous.churned : undefined, true) },
                { label: 'Reactivated', value: String(report.reactivated), description: 'Returned after a lapse of 30+ days' },
            ]}
        />
    )
}

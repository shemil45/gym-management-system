import type { RetentionReport } from '@/lib/reports/members'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'

type Totals = RetentionReport['totals']

export default function RetentionKpis({ current, previous }: { current: Totals; previous: Totals }) {
    // Retention is null when nothing ended in a period; a delta against an
    // unknown is meaningless, so those cards show a dash instead.
    const compare = (cur: number | null, prev: number | null, invert?: boolean): Pick<KpiCardProps, 'delta' | 'note'> =>
        cur === null || prev === null ? { note: '—' } : { delta: { current: cur, previous: prev, invert } }

    return (
        <KpiStrip
            columns={3}
            items={[
                { label: 'Retention', value: current.retention === null ? '—' : `${current.retention.toFixed(1)}%`, ...compare(current.retention, previous.retention) },
                { label: 'Ended', value: String(current.ended), ...compare(current.ended, previous.ended, true) },
                { label: 'Renewed', value: String(current.renewed), ...compare(current.renewed, previous.renewed) },
            ]}
        />
    )
}

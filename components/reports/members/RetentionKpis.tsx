import type { RetentionReport } from '@/lib/reports/members'
import DeltaBadge from '@/components/reports/DeltaBadge'

type Totals = RetentionReport['totals']

export default function RetentionKpis({ current, previous }: { current: Totals; previous: Totals }) {
    const items: { label: string; value: string; cur: number | null; prev: number | null; invert?: boolean }[] = [
        { label: 'Retention', value: current.retention === null ? '—' : `${current.retention.toFixed(1)}%`, cur: current.retention, prev: previous.retention },
        { label: 'Ended', value: String(current.ended), cur: current.ended, prev: previous.ended, invert: true },
        { label: 'Renewed', value: String(current.renewed), cur: current.renewed, prev: previous.renewed },
    ]
    return (
        <dl className="grid gap-3 sm:grid-cols-3">
            {items.map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">{item.label}</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{item.value}</dd>
                    <div className="mt-1">
                        {item.cur === null || item.prev === null
                            ? <span className="text-xs text-gray-400 dark:text-neutral-500">—</span>
                            : <DeltaBadge current={item.cur} previous={item.prev} invert={item.invert} />}
                    </div>
                </div>
            ))}
        </dl>
    )
}

import type { FootfallKpis as FootfallKpisData } from '@/lib/reports/attendance-aggregate'
import DeltaBadge from '@/components/reports/DeltaBadge'

export default function FootfallKpis({ current, previous }: { current: FootfallKpisData; previous: FootfallKpisData }) {
    return (
        <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Visits</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.visits}</dd>
                <div className="mt-1"><DeltaBadge current={current.visits} previous={previous.visits} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Unique members</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.uniqueMembers}</dd>
                <div className="mt-1"><DeltaBadge current={current.uniqueMembers} previous={previous.uniqueMembers} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Per day</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.perDay.toFixed(1)}</dd>
                <div className="mt-1"><DeltaBadge current={current.perDay} previous={previous.perDay} /></div>
            </div>
        </dl>
    )
}

import type { JoinKpis as JoinKpisData } from '@/lib/reports/members-aggregate'
import DeltaBadge from '@/components/reports/DeltaBadge'

export default function JoinsKpis({ current, previous }: { current: JoinKpisData; previous: JoinKpisData }) {
    return (
        <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">New joins</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.joins}</dd>
                <div className="mt-1"><DeltaBadge current={current.joins} previous={previous.joins} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Referral share</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.referralShare.toFixed(1)}%</dd>
                <div className="mt-1"><DeltaBadge current={current.referralShare} previous={previous.referralShare} /></div>
            </div>
        </dl>
    )
}

import type { OverviewKpis as OverviewKpisData } from '@/lib/reports/referrals-aggregate'
import DeltaBadge from '@/components/reports/DeltaBadge'
import { formatCurrency } from '@/lib/utils/currency'

export default function OverviewKpis({ current, previous, outstanding }: { current: OverviewKpisData; previous: OverviewKpisData; outstanding: number }) {
    return (
        <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Created</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.referrals}</dd>
                <div className="mt-1"><DeltaBadge current={current.referrals} previous={previous.referrals} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Conversions</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.conversions}</dd>
                <div className="mt-1"><DeltaBadge current={current.conversions} previous={previous.conversions} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Coins issued</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.coinsIssued}</dd>
                <div className="mt-1"><DeltaBadge current={current.coinsIssued} previous={previous.coinsIssued} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Coins redeemed</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{current.coinsRedeemed}</dd>
                <div className="mt-1"><DeltaBadge current={current.coinsRedeemed} previous={previous.coinsRedeemed} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Outstanding balance</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{outstanding} coins · {formatCurrency(outstanding)}</dd>
                <div className="mt-1 text-xs text-gray-400 dark:text-neutral-500">as of today</div>
            </div>
        </dl>
    )
}

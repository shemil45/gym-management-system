import { formatDate } from '@/lib/utils/date'
import { STATUS_LABELS, type EffectiveStatus } from '@/lib/reports/members-aggregate'
import type { RosterReport } from '@/lib/reports/members'

const ORDER: EffectiveStatus[] = ['active', 'expiring', 'expired', 'frozen', 'inactive']

export default function RosterCards({ report }: { report: RosterReport }) {
    const { counts, asOf } = report
    const items = [...ORDER.map((status) => ({ label: STATUS_LABELS[status], value: counts[status] })), { label: 'Total', value: counts.total }]

    return (
        <div className="space-y-2">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {items.map((item) => (
                    <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                        <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">{item.label}</dt>
                        <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{item.value}</dd>
                    </div>
                ))}
            </dl>
            <p className="text-xs text-gray-500 dark:text-neutral-400">As of {formatDate(asOf, 'dd MMM yyyy')}</p>
        </div>
    )
}

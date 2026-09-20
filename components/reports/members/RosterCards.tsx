import { formatDate } from '@/lib/utils/date'
import { STATUS_LABELS, type EffectiveStatus } from '@/lib/reports/members-aggregate'
import type { RosterReport } from '@/lib/reports/members'
import KpiStrip from '@/components/reports/kpi/KpiStrip'

const ORDER: EffectiveStatus[] = ['active', 'expiring', 'expired', 'frozen', 'inactive']

export default function RosterCards({ report }: { report: RosterReport }) {
    const { counts, asOf } = report

    return (
        <div className="space-y-2">
            <KpiStrip
                columns={6}
                items={[
                    ...ORDER.map((status) => ({ key: status, label: STATUS_LABELS[status], value: String(counts[status]) })),
                    { key: 'total', label: 'Total', value: String(counts.total) },
                ]}
            />
            <p className="text-xs text-gray-500 dark:text-neutral-400">As of {formatDate(asOf, 'dd MMM yyyy')}</p>
        </div>
    )
}

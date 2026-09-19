import { formatCurrency } from '@/lib/utils/currency'
import type { SummaryKpis } from '@/lib/reports/payments-aggregate'
import DeltaBadge from '@/components/reports/DeltaBadge'

export default function KpiStrip({ current, previous }: { current: SummaryKpis; previous: SummaryKpis }) {
    const items = [
        { label: 'Collected', value: formatCurrency(current.collected), cur: current.collected, prev: previous.collected },
        { label: 'Transactions', value: String(current.txns), cur: current.txns, prev: previous.txns },
        { label: 'Avg ticket', value: formatCurrency(current.avgTicket), cur: current.avgTicket, prev: previous.avgTicket },
    ]
    return (
        <dl className="grid gap-3 sm:grid-cols-3">
            {items.map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">{item.label}</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{item.value}</dd>
                    <div className="mt-1"><DeltaBadge current={item.cur} previous={item.prev} /></div>
                </div>
            ))}
        </dl>
    )
}

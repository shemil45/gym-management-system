import { formatCurrency } from '@/lib/utils/currency'
import type { PnlKpis as PnlKpisData } from '@/lib/reports/expenses-aggregate'
import DeltaBadge from '@/components/reports/DeltaBadge'

export default function PnlKpis({ current, previous }: { current: PnlKpisData; previous: PnlKpisData }) {
    const netUp = current.net >= 0
    const items = [
        { label: 'Net income', value: formatCurrency(current.netIncome), cur: current.netIncome, prev: previous.netIncome, valueClass: 'text-gray-900 dark:text-white', invert: false },
        { label: 'Total expenses', value: formatCurrency(current.totalExpenses), cur: current.totalExpenses, prev: previous.totalExpenses, valueClass: 'text-gray-900 dark:text-white', invert: true },
        { label: 'Net', value: formatCurrency(current.net), cur: current.net, prev: previous.net, valueClass: netUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400', invert: false },
    ]
    return (
        <dl className="grid gap-3 sm:grid-cols-3">
            {items.map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">{item.label}</dt>
                    <dd className={`mt-1 text-xl font-semibold tabular-nums ${item.valueClass}`}>{item.value}</dd>
                    <div className="mt-1"><DeltaBadge current={item.cur} previous={item.prev} invert={item.invert} /></div>
                </div>
            ))}
        </dl>
    )
}

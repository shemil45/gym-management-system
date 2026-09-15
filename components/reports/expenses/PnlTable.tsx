import { formatCurrency } from '@/lib/utils/currency'
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from '@/lib/reports/expenses-aggregate'
import type { PnlReport } from '@/lib/reports/expenses'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 whitespace-nowrap'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200 whitespace-nowrap'

const COLUMN_COUNT = 4 + EXPENSE_CATEGORIES.length + 3 + 1

function netClass(net: number): string {
    return net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
}

export default function PnlTable({ report }: { report: PnlReport }) {
    const { buckets, totals } = report
    const empty = buckets.every((b) => b.netIncome === 0 && b.totalExpenses === 0 && b.refunded === 0)

    const cells = (b: typeof totals) => [
        formatCurrency(b.membershipRevenue), formatCurrency(b.admissionFees), formatCurrency(b.refunded), formatCurrency(b.netIncome),
        ...EXPENSE_CATEGORIES.map((c) => formatCurrency(b.byCategory[c])),
        formatCurrency(b.totalExpenses),
    ]

    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                    <tr>
                        <th className={`${th} text-left`}>Period</th>
                        <th className={th}>Membership</th><th className={th}>Admission</th><th className={th}>Refunds</th><th className={th}>Net income</th>
                        {EXPENSE_CATEGORIES.map((c) => <th key={c} className={th}>{CATEGORY_LABELS[c]}</th>)}
                        <th className={th}>Total expenses</th><th className={th}>Net</th><th className={th}>Margin</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {empty ? (
                        <tr><td colSpan={COLUMN_COUNT} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-neutral-400">No income or expenses in this period</td></tr>
                    ) : (
                        buckets.map((b) => (
                            <tr key={b.start} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{b.label}</td>
                                {cells(b).map((cell, i) => <td key={i} className={td}>{cell}</td>)}
                                <td className={`${td} font-medium ${netClass(b.net)}`}>{formatCurrency(b.net)}</td>
                                <td className={td}>{b.margin === null ? '—' : `${b.margin.toFixed(1)}%`}</td>
                            </tr>
                        ))
                    )}
                </tbody>
                {!empty && (
                    <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 font-semibold text-gray-900 dark:border-neutral-700 dark:text-white">
                        <tr>
                            <td className={`${td} text-left`}>Total</td>
                            {cells(totals).map((cell, i) => <td key={i} className={td}>{cell}</td>)}
                            <td className={`${td} ${netClass(totals.net)}`}>{formatCurrency(totals.net)}</td>
                            <td className={td}>{totals.margin === null ? '—' : `${totals.margin.toFixed(1)}%`}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </section>
    )
}

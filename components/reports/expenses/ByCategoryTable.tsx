import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { CategoryReport } from '@/lib/reports/expenses'
import DeltaBadge from '@/components/reports/DeltaBadge'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 whitespace-nowrap'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200 whitespace-nowrap'

export default function ByCategoryTable({ report }: { report: CategoryReport }) {
    const { rows, total, previousTotal } = report
    const empty = rows.length === 0
    const totalEntries = rows.reduce((s, r) => s + r.entries, 0)
    const totalAvg = totalEntries ? total / totalEntries : 0
    // The two comparison columns only exist when there is a comparison period.
    const compared = previousTotal !== null
    const suffix = comparisonSuffix(report.compare)
    const columns = compared ? 7 : 5

    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                    <tr>
                        <th className={`${th} text-left`}>Category</th>
                        <th className={th}>Entries</th><th className={th}>Total</th><th className={th}>Share</th>
                        <th className={th}>Avg per entry</th>
                        {compared && <><th className={th}>Previous</th><th className={th}>{suffix}</th></>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {empty ? (
                        <tr><td colSpan={columns} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-neutral-400">No expenses in this period</td></tr>
                    ) : (
                        rows.map((r) => (
                            <tr key={r.category} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{r.label}</td>
                                <td className={td}>{r.entries}</td>
                                <td className={td}>{formatCurrency(r.total)}</td>
                                <td className={td}>{r.share.toFixed(1)}%</td>
                                <td className={td}>{formatCurrency(r.avg)}</td>
                                {compared && <><td className={td}>{formatCurrency(r.previous)}</td><td className={td}><DeltaBadge current={r.total} previous={r.previous} invert suffix="" /></td></>}
                            </tr>
                        ))
                    )}
                </tbody>
                {!empty && (
                    <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 font-semibold text-gray-900 dark:border-neutral-700 dark:text-white">
                        <tr>
                            <td className={`${td} text-left`}>Total</td>
                            <td className={td}>{totalEntries}</td>
                            <td className={td}>{formatCurrency(total)}</td>
                            <td className={td}>100%</td>
                            <td className={td}>{formatCurrency(totalAvg)}</td>
                            {compared && <><td className={td}>{formatCurrency(previousTotal)}</td><td className={td}><DeltaBadge current={total} previous={previousTotal} invert suffix="" /></td></>}
                        </tr>
                    </tfoot>
                )}
            </table>
        </section>
    )
}

import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { PlanReport } from '@/lib/reports/payments'
import DeltaBadge from '@/components/reports/DeltaBadge'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200'

export default function ByPlanTable({ report }: { report: PlanReport }) {
    // A comparison column only when there is a comparison period to compare with.
    const compared = report.previousTotal !== null
    const suffix = comparisonSuffix(report.compare)
    const columns = compared ? 5 : 4

    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                    <tr>
                        <th className={`${th} text-left`}>Plan</th><th className={th}>Txns</th><th className={th}>Revenue</th><th className={th}>Share</th>
                        {compared && <th className={th}>{suffix}</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {report.rows.length === 0 && <tr><td colSpan={columns} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-neutral-400">No payments in this period<span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">Choose another preset or date range above.</span></td></tr>}
                    {report.rows.map((row) => (
                        <tr key={row.plan} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                            <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{row.plan}</td>
                            <td className={td}>{row.txns}</td>
                            <td className={td}>{formatCurrency(row.revenue)}</td>
                            <td className={td}>{row.share.toFixed(1)}%</td>
                            {compared && (
                                <td className={td}>
                                    <DeltaBadge current={row.revenue} previous={row.previousRevenue ?? 0} suffix="" />
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 font-semibold text-gray-900 dark:border-neutral-700 dark:text-white">
                    <tr>
                        <td className={`${td} text-left`}>Total</td><td className={td}>{report.total.txns}</td><td className={td}>{formatCurrency(report.total.revenue)}</td><td className={td}>100%</td>
                        {compared && report.previousTotal && (
                            <td className={td}><DeltaBadge current={report.total.revenue} previous={report.previousTotal.revenue} suffix="" /></td>
                        )}
                    </tr>
                </tfoot>
            </table>
        </section>
    )
}

import { formatCurrency } from '@/lib/utils/currency'
import type { StaffReport } from '@/lib/reports/payments'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200'

export default function ByStaffTable({ report }: { report: StaffReport }) {
    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                    <tr><th className={`${th} text-left`}>Collected by</th><th className={th}>Txns</th><th className={th}>Collected</th><th className={th}>Cash handled</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {report.rows.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-neutral-400">No payments in this period<span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">Choose another preset or date range above.</span></td></tr>}
                    {report.rows.map((row) => (
                        <tr key={row.staff} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                            <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{row.staff}</td>
                            <td className={td}>{row.txns}</td>
                            <td className={td}>{formatCurrency(row.collected)}</td>
                            <td className={td}>{formatCurrency(row.cash)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 font-semibold text-gray-900 dark:border-neutral-700 dark:text-white">
                    <tr><td className={`${td} text-left`}>Total</td><td className={td}>{report.total.txns}</td><td className={td}>{formatCurrency(report.total.collected)}</td><td className={td}>{formatCurrency(report.total.cash)}</td></tr>
                </tfoot>
            </table>
        </section>
    )
}

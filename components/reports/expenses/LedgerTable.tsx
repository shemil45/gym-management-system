import { ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { CATEGORY_LABELS } from '@/lib/reports/expenses-aggregate'
import type { LedgerReport } from '@/lib/reports/expenses'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

export default function LedgerTable({ report }: { report: LedgerReport }) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Date</th><th className={th}>Category</th><th className={th}>Description</th>
                            <th className={`${th} text-right`}>Amount</th><th className={th}>Added by</th><th className={th}>Receipt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {report.rows.length === 0 && (
                            <tr><td colSpan={6} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No expenses in this period</td></tr>
                        )}
                        {report.rows.map((row) => (
                            <tr key={row.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} whitespace-nowrap`}>{formatDate(row.expense_date, 'dd MMM yyyy')}</td>
                                <td className={td}>
                                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-neutral-800 dark:text-neutral-200">
                                        {CATEGORY_LABELS[row.category]}
                                    </span>
                                </td>
                                <td className={td}>
                                    <div className="flex max-w-md items-center gap-1.5">
                                        <span className="truncate" title={row.description}>{row.description}</span>
                                        {row.is_demo && <SupportDemoBadge />}
                                    </div>
                                </td>
                                <td className={numStrong}>{formatCurrency(row.amount)}</td>
                                <td className={`${td} whitespace-nowrap`}>{row.adder_name ?? '—'}</td>
                                <td className={td}>
                                    {row.receipt_url ? (
                                        <a href={row.receipt_url} target="_blank" rel="noopener noreferrer" aria-label="Open receipt"
                                            className="inline-flex items-center rounded text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white">
                                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                        </a>
                                    ) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{report.totals.count} entries</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(report.totals.amount)}</span>
            </footer>
        </section>
    )
}

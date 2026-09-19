import type { RetentionReport } from '@/lib/reports/members'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 whitespace-nowrap'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200 whitespace-nowrap'

export default function RetentionTable({ report }: { report: RetentionReport }) {
    const { buckets, totals } = report
    const empty = buckets.length === 0

    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                    <tr>
                        <th className={`${th} text-left`}>Period</th>
                        <th className={th}>Ended</th><th className={th}>Renewed</th><th className={th}>Retention</th><th className={th}>Churned</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {empty ? (
                        <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-neutral-400">No membership windows ended in this period</td></tr>
                    ) : (
                        buckets.map((b) => (
                            <tr key={b.start} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{b.label}</td>
                                <td className={td}>{b.ended}</td>
                                <td className={td}>{b.renewed}</td>
                                <td className={td}>{b.retention === null ? '—' : `${b.retention.toFixed(1)}%`}</td>
                                <td className={td}>{b.churned}</td>
                            </tr>
                        ))
                    )}
                </tbody>
                {!empty && (
                    <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 font-semibold text-gray-900 dark:border-neutral-700 dark:text-white">
                        <tr>
                            <td className={`${td} text-left`}>Total</td>
                            <td className={td}>{totals.ended}</td>
                            <td className={td}>{totals.renewed}</td>
                            <td className={td}>{totals.retention === null ? '—' : `${totals.retention.toFixed(1)}%`}</td>
                            <td className={td}>{totals.churned}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
            <footer className="border-t border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
                Windows that ended in the last 30 days may still renew.
            </footer>
        </section>
    )
}

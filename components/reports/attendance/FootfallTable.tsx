import type { FootfallReport } from '@/lib/reports/attendance'
import { ENTRY_METHODS, ENTRY_METHOD_LABELS } from '@/lib/reports/attendance-aggregate'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const thNum = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const num = 'px-3 py-2 text-sm whitespace-nowrap text-right tabular-nums text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

const formatHour = (hour: number | null) => (hour === null ? '—' : `${String(hour).padStart(2, '0')}:00`)
const formatMinutes = (minutes: number | null) => (minutes === null ? '—' : `${Math.round(minutes)} min`)

const COLUMN_COUNT = 10

export default function FootfallTable({ report }: { report: FootfallReport }) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Period</th>
                            <th className={thNum}>Visits</th>
                            <th className={thNum}>Unique members</th>
                            <th className={thNum}>Per day</th>
                            <th className={thNum}>Peak hour</th>
                            {ENTRY_METHODS.map((method) => <th key={method} className={thNum}>{ENTRY_METHOD_LABELS[method]}</th>)}
                            <th className={thNum}>Avg duration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {report.totals.visits === 0 ? (
                            <tr><td colSpan={COLUMN_COUNT} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No visits in this period</td></tr>
                        ) : report.buckets.map((bucket) => (
                            <tr key={bucket.start} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} whitespace-nowrap`}>{bucket.label}</td>
                                <td className={num}>{bucket.visits}</td>
                                <td className={num}>{bucket.uniqueMembers}</td>
                                <td className={num}>{bucket.perDay.toFixed(1)}</td>
                                <td className={num}>{formatHour(bucket.peakHour)}</td>
                                {ENTRY_METHODS.map((method) => <td key={method} className={num}>{bucket.byMethod[method]}</td>)}
                                <td className={num}>{formatMinutes(bucket.avgMinutes)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {report.totals.visits > 0 && (
                        <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                            <tr>
                                <td className={`${td} font-medium text-gray-900 dark:text-white`}>Total</td>
                                <td className={numStrong}>{report.totals.visits}</td>
                                <td className={numStrong}>{report.totals.uniqueMembers}</td>
                                <td className={numStrong}>{report.totals.perDay.toFixed(1)}</td>
                                <td className={numStrong}>{formatHour(report.totals.peakHour)}</td>
                                {ENTRY_METHODS.map((method) => <td key={method} className={numStrong}>{report.totals.byMethod[method]}</td>)}
                                <td className={numStrong}>{formatMinutes(report.totals.avgMinutes)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </section>
    )
}

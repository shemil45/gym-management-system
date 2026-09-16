import { formatDate } from '@/lib/utils/date'
import { istDate } from '@/lib/reports/members-aggregate'
import type { ListReport } from '@/lib/reports/referrals'
import type { ReferralStatus } from '@/lib/reports/referrals-aggregate'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const thNum = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const num = 'px-3 py-2 text-sm whitespace-nowrap text-right tabular-nums text-gray-800 dark:text-neutral-200'

const COLUMN_COUNT = 7

const STATUS_STYLES: Record<ReferralStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    applied: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    expired: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400',
}

export default function ReferralListTable({ report }: { report: ListReport }) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Date</th>
                            <th className={th}>Referrer</th>
                            <th className={th}>Referred member</th>
                            <th className={th}>Code</th>
                            <th className={th}>Status</th>
                            <th className={th}>Applied on</th>
                            <th className={thNum}>Days to convert</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {report.rows.length === 0 && (
                            <tr><td colSpan={COLUMN_COUNT} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No referrals in this period</td></tr>
                        )}
                        {report.rows.map((row) => (
                            <tr key={row.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} whitespace-nowrap`}>{formatDate(istDate(row.created_at), 'dd MMM yyyy')}</td>
                                <td className={td}>
                                    <div className="font-medium text-gray-900 dark:text-white">{row.referrer_name ?? '—'}</div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{row.referrer_code ?? '—'}</div>
                                </td>
                                <td className={td}>
                                    <div className="font-medium text-gray-900 dark:text-white">{row.referred_name ?? '—'}</div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{row.referred_code ?? '—'}</div>
                                </td>
                                <td className={td}>{row.code ?? '—'}</td>
                                <td className={td}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[row.status]}`}>{row.status}</span></td>
                                <td className={`${td} whitespace-nowrap`}>{row.applied_at ? formatDate(istDate(row.applied_at), 'dd MMM yyyy') : '—'}</td>
                                <td className={num}>{row.daysToConvert ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{report.rows.length} referrals</span>
            </footer>
        </section>
    )
}

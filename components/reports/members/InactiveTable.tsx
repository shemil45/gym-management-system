import { formatDate } from '@/lib/utils/date'
import type { InactiveReport } from '@/lib/reports/members'
import CopyPhoneButton from '@/components/reports/payments/CopyPhoneButton'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

export default function InactiveTable({ report }: { report: InactiveReport }) {
    const { days } = report
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Member</th><th className={th}>Phone</th><th className={th}>Plan</th>
                            <th className={th}>Expiry</th><th className={th}>Last visit</th><th className={`${th} text-right`}>Days since</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {report.rows.length === 0 && (
                            <tr><td colSpan={6} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No inactive members in this window</td></tr>
                        )}
                        {report.rows.map((row) => (
                            <tr key={row.member.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={td}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-gray-900 dark:text-white">{row.member.full_name}</span>
                                        {row.member.is_demo && <SupportDemoBadge />}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{row.member.member_code}</div>
                                </td>
                                <td className={td}>{row.member.phone ? <CopyPhoneButton phone={row.member.phone} name={row.member.full_name} /> : '—'}</td>
                                <td className={td}>{row.member.plan_name ?? '—'}</td>
                                <td className={`${td} whitespace-nowrap`}>{row.expiry ? formatDate(row.expiry, 'dd MMM yyyy') : '—'}</td>
                                <td className={`${td} whitespace-nowrap`}>{row.lastVisit ? formatDate(row.lastVisit, 'dd MMM yyyy') : `No visit in ${days}d`}</td>
                                <td className={numStrong}>{row.daysSince === null ? `${days}+` : `${row.daysSince}d`}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{report.rows.length} inactive</span>
            </footer>
        </section>
    )
}

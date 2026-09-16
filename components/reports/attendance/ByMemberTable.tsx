import { formatDate } from '@/lib/utils/date'
import type { ByMemberReport } from '@/lib/reports/attendance'
import CopyPhoneButton from '@/components/reports/payments/CopyPhoneButton'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const thNum = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const num = 'px-3 py-2 text-sm whitespace-nowrap text-right tabular-nums text-gray-800 dark:text-neutral-200'

const COLUMN_COUNT = 7

const formatMinutes = (minutes: number | null) => (minutes === null ? '—' : `${Math.round(minutes)} min`)

export default function ByMemberTable({ report }: { report: ByMemberReport }) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Member</th><th className={th}>Phone</th><th className={th}>Plan</th>
                            <th className={thNum}>Visits</th><th className={thNum}>Avg duration</th>
                            <th className={th}>Last visit</th><th className={thNum}>Days since</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {report.rows.length === 0 && (
                            <tr><td colSpan={COLUMN_COUNT} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No visits in this period</td></tr>
                        )}
                        {report.rows.map(({ member, visits, avgMinutes, lastVisit, daysSince }) => (
                            <tr key={member.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={td}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-gray-900 dark:text-white">{member.full_name}</span>
                                        {member.is_demo && <SupportDemoBadge />}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{member.member_code}</div>
                                </td>
                                <td className={td}>{member.phone ? <CopyPhoneButton phone={member.phone} name={member.full_name} /> : '—'}</td>
                                <td className={td}>{member.plan_name ?? '—'}</td>
                                <td className={num}>{visits}</td>
                                <td className={num}>{formatMinutes(avgMinutes)}</td>
                                <td className={`${td} whitespace-nowrap`}>{lastVisit ? formatDate(lastVisit, 'dd MMM yyyy') : '—'}</td>
                                <td className={num}>{daysSince ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{report.rows.length} members · {report.totalVisits} visits</span>
            </footer>
        </section>
    )
}

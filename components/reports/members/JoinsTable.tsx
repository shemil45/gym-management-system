import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import type { JoinsReport } from '@/lib/reports/members'
import CopyPhoneButton from '@/components/reports/payments/CopyPhoneButton'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

const SOURCE_LABELS = { referral: 'Referral', 'walk-in': 'Walk-in' } as const

export default function JoinsTable({ report }: { report: JoinsReport }) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Join date</th><th className={th}>Member</th><th className={th}>Phone</th>
                            <th className={th}>Plan</th><th className={th}>Source</th><th className={`${th} text-right`}>First payment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {report.rows.length === 0 && (
                            <tr><td colSpan={6} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No new joins in this period</td></tr>
                        )}
                        {report.rows.map(({ member, joinDate, source, firstPayment }) => (
                            <tr key={member.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} whitespace-nowrap`}>{formatDate(joinDate, 'dd MMM yyyy')}</td>
                                <td className={td}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-gray-900 dark:text-white">{member.full_name}</span>
                                        {member.is_demo && <SupportDemoBadge />}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{member.member_code}</div>
                                </td>
                                <td className={td}>{member.phone ? <CopyPhoneButton phone={member.phone} name={member.full_name} /> : '—'}</td>
                                <td className={td}>{member.plan_name ?? '—'}</td>
                                <td className={td}>
                                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-neutral-800 dark:text-neutral-200">{SOURCE_LABELS[source]}</span>
                                    {source === 'referral' && member.referrer_name && (
                                        <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">via {member.referrer_name}</div>
                                    )}
                                </td>
                                <td className={numStrong}>
                                    {firstPayment
                                        ? <>{formatCurrency(firstPayment.amount)}<span className="ml-1 font-normal text-gray-400 dark:text-neutral-500">· {formatDate(firstPayment.payment_date, 'dd MMM')}</span></>
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{report.rows.length} joins</span>
            </footer>
        </section>
    )
}

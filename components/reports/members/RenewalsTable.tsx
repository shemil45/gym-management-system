import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import type { PaymentStub, ReportMemberRow } from '@/lib/reports/members-aggregate'
import type { RenewalsReport } from '@/lib/reports/members'
import CopyPhoneButton from '@/components/reports/payments/CopyPhoneButton'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

type Row = { member: ReportMemberRow; date: string; days: number; lastPayment: PaymentStub | null }

function normalize(report: RenewalsReport): Row[] {
    return report.mode === 'lapsed'
        ? report.rows.map((r) => ({ member: r.member, date: r.endedOn, days: r.overdueDays, lastPayment: r.lastPayment }))
        : report.rows.map((r) => ({ member: r.member, date: r.expiry, days: r.daysLeft, lastPayment: r.lastPayment }))
}

export default function RenewalsTable({ report }: { report: RenewalsReport }) {
    const lapsedMode = report.mode === 'lapsed'
    const rows = normalize(report)
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Member</th><th className={th}>Phone</th><th className={th}>Plan</th>
                            <th className={th}>{lapsedMode ? 'Ended on' : 'Expiry'}</th>
                            <th className={`${th} text-right`}>{lapsedMode ? 'Overdue' : 'Days left'}</th>
                            <th className={`${th} text-right`}>Last payment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {rows.length === 0 && (
                            <tr><td colSpan={6} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>
                                {lapsedMode ? 'No lapsed members in this period' : 'No renewals due in this window'}
                            </td></tr>
                        )}
                        {rows.map((row) => (
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
                                <td className={`${td} whitespace-nowrap`}>{formatDate(row.date, 'dd MMM yyyy')}</td>
                                <td className={numStrong}>{lapsedMode ? `${row.days}d overdue` : `${row.days}d left`}</td>
                                <td className={numStrong}>
                                    {row.lastPayment
                                        ? <>{formatCurrency(row.lastPayment.amount)}<span className="ml-1 font-normal text-gray-400 dark:text-neutral-500">· {formatDate(row.lastPayment.payment_date, 'dd MMM')}</span></>
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{rows.length} {lapsedMode ? 'lapsed' : 'due'}</span>
            </footer>
        </section>
    )
}

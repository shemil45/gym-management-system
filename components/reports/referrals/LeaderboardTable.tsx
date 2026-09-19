import type { LeaderboardReport } from '@/lib/reports/referrals'
import CopyPhoneButton from '@/components/reports/payments/CopyPhoneButton'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const thNum = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const num = 'px-3 py-2 text-sm whitespace-nowrap text-right tabular-nums text-gray-800 dark:text-neutral-200'

const COLUMN_COUNT = 8

const formatConversion = (conversion: number | null) => (conversion === null ? '—' : `${conversion.toFixed(1)}%`)

export default function LeaderboardTable({ report }: { report: LeaderboardReport }) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={thNum}>Rank</th>
                            <th className={th}>Referrer</th>
                            <th className={th}>Phone</th>
                            <th className={thNum}>Referrals</th>
                            <th className={thNum}>Converted</th>
                            <th className={thNum}>Conversion %</th>
                            <th className={thNum}>Coins earned</th>
                            <th className={thNum}>Current balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {report.rows.length === 0 && (
                            <tr><td colSpan={COLUMN_COUNT} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No referrals in this period</td></tr>
                        )}
                        {report.rows.map((row, i) => (
                            <tr key={row.member.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={num}>{i + 1}</td>
                                <td className={td}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-gray-900 dark:text-white">{row.member.full_name}</span>
                                        {row.member.is_demo && <SupportDemoBadge />}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{row.member.member_code}</div>
                                </td>
                                <td className={td}>{row.member.phone ? <CopyPhoneButton phone={row.member.phone} name={row.member.full_name} /> : '—'}</td>
                                <td className={num}>{row.referrals}</td>
                                <td className={num}>{row.converted}</td>
                                <td className={num}>{formatConversion(row.conversion)}</td>
                                <td className={num}>{row.coinsEarned}</td>
                                <td className={num}>{row.balance}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{report.rows.length} referrers</span>
            </footer>
        </section>
    )
}

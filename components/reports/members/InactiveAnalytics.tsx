import { formatDate } from '@/lib/utils/date'
import type { InactiveReport } from '@/lib/reports/members'
import { inactiveInsight } from '@/lib/reports/members-insights'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'
import CopyPhoneButton from '@/components/reports/payments/CopyPhoneButton'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'

/**
 * Inactivity summary → members who are inactive *and* expiring soon → one
 * insight, then the existing inactive list. The at-risk section shows two
 * facts per member and no score; being on it means "worth a call", not
 * "has churned".
 */
export default function InactiveAnalytics({ report }: { report: InactiveReport }) {
    const { summary, atRisk, days } = report
    const share = (n: number) => (summary.activeBase ? `${((n / summary.activeBase) * 100).toFixed(1)}% of ${summary.activeBase} active` : undefined)

    return (
        <>
            <KpiStrip
                columns={4}
                items={[
                    { label: `No visit in ${days}+ days`, value: String(report.rows.length), description: 'Shown below', tone: report.rows.length > 0 ? 'negative' : 'positive' },
                    { label: 'No visit in 7+ days', value: String(summary.over7), description: share(summary.over7) },
                    { label: 'No visit in 14+ days', value: String(summary.over14), description: share(summary.over14) },
                    { label: 'No visit in 30+ days', value: String(summary.over30), description: share(summary.over30) },
                ]}
            />

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 print:break-inside-avoid">
                <header className="border-b border-gray-200 px-3 py-2.5 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">At risk</h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
                        Members with no visit in {days}+ days whose membership also expires within 30 days — two signals, no score.
                    </p>
                </header>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b border-gray-200 bg-gray-50/60 dark:border-neutral-700 dark:bg-neutral-800/40">
                            <tr><th className={th}>Member</th><th className={th}>Phone</th><th className={th}>Plan</th><th className={th}>Expires</th><th className={th}>Last visit</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                            {atRisk.length === 0 && (
                                <tr><td colSpan={5} className={`${td} py-8 text-center text-gray-500 dark:text-neutral-400`}>No inactive member expires in the next 30 days</td></tr>
                            )}
                            {atRisk.map(({ member, expiry, daysLeft, lastVisit, daysSince }) => (
                                <tr key={member.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                    <td className={td}>
                                        <div className="flex items-center gap-1.5"><span className="font-medium text-gray-900 dark:text-white">{member.full_name}</span>{member.is_demo && <SupportDemoBadge />}</div>
                                        <div className="text-xs text-gray-500 dark:text-neutral-400">{member.member_code}</div>
                                    </td>
                                    <td className={td}>{member.phone ? <CopyPhoneButton phone={member.phone} name={member.full_name} /> : '—'}</td>
                                    <td className={td}>{member.plan_name ?? '—'}</td>
                                    <td className={`${td} whitespace-nowrap`}>
                                        <span className="font-medium text-gray-900 dark:text-white">{daysLeft === 0 ? 'Today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}</span>
                                        <span className="ml-1 text-xs text-gray-500 dark:text-neutral-400">{expiry ? formatDate(expiry, 'dd MMM') : ''}</span>
                                    </td>
                                    <td className={`${td} whitespace-nowrap`}>
                                        {lastVisit && daysSince !== null
                                            ? <>{daysSince} day{daysSince === 1 ? '' : 's'} ago<span className="ml-1 text-xs text-gray-500 dark:text-neutral-400">{formatDate(lastVisit, 'dd MMM')}</span></>
                                            : <span className="text-gray-500 dark:text-neutral-400">None in the last 30 days</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <InsightBar insight={inactiveInsight(report)} />
        </>
    )
}

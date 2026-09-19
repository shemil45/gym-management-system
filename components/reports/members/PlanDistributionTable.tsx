import { formatCurrency } from '@/lib/utils/currency'
import type { RosterReport } from '@/lib/reports/members'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 whitespace-nowrap'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200 whitespace-nowrap'

export default function PlanDistributionTable({ plans }: { plans: RosterReport['plans'] }) {
    const empty = plans.length === 0
    const totalMembers = plans.reduce((s, p) => s + p.members, 0)

    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                    <tr>
                        <th className={`${th} text-left`}>Plan</th>
                        <th className={th}>Members</th><th className={th}>Share</th><th className={th}>Price</th>
                        <th className={th}>Duration</th><th className={th}>Monthly value</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {empty ? (
                        <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-neutral-400">No active or expiring members</td></tr>
                    ) : (
                        plans.map((p) => (
                            <tr key={p.plan} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{p.plan}</td>
                                <td className={td}>{p.members}</td>
                                <td className={td}>{p.share.toFixed(1)}%</td>
                                <td className={td}>{formatCurrency(p.price)}</td>
                                <td className={td}>{p.durationDays}d</td>
                                <td className={td}>{formatCurrency(p.monthlyValue)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
                {!empty && (
                    <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 font-semibold text-gray-900 dark:border-neutral-700 dark:text-white">
                        <tr>
                            <td className={`${td} text-left`}>Total</td>
                            <td className={td}>{totalMembers}</td>
                            <td className={td}>100%</td>
                            <td className={td}>—</td>
                            <td className={td}>—</td>
                            <td className={td}>—</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </section>
    )
}

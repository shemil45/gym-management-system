import type { OverviewReport } from '@/lib/reports/referrals'
import { formatCurrency } from '@/lib/utils/currency'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const thNum = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const num = 'px-3 py-2 text-sm whitespace-nowrap text-right tabular-nums text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

const COLUMN_COUNT = 9

const formatConversion = (conversion: number | null) => (conversion === null ? '—' : `${conversion.toFixed(1)}%`)

export default function OverviewTable({ report }: { report: OverviewReport }) {
    const empty = report.totals.created === 0 && report.totals.converted === 0 && report.totals.coinsRedeemed === 0

    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Period</th>
                            <th className={thNum}>Created</th>
                            <th className={thNum}>Converted</th>
                            <th className={thNum}>Pending</th>
                            <th className={thNum}>Expired</th>
                            <th className={thNum}>Conversion %</th>
                            <th className={thNum}>Coins issued</th>
                            <th className={thNum}>Coins redeemed</th>
                            <th className={thNum}>Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {empty ? (
                            <tr><td colSpan={COLUMN_COUNT} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No referral activity in this period</td></tr>
                        ) : report.buckets.map((bucket) => (
                            <tr key={bucket.start} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} whitespace-nowrap`}>{bucket.label}</td>
                                <td className={num}>{bucket.created}</td>
                                <td className={num}>{bucket.converted}</td>
                                <td className={num}>{bucket.pending}</td>
                                <td className={num}>{bucket.expired}</td>
                                <td className={num}>{formatConversion(bucket.conversion)}</td>
                                <td className={num}>{bucket.coinsIssued}</td>
                                <td className={num}>{bucket.coinsRedeemed}</td>
                                <td className={num}>{formatCurrency(bucket.coinsRedeemed)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {!empty && (
                        <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                            <tr>
                                <td className={`${td} font-medium text-gray-900 dark:text-white`}>Total</td>
                                <td className={numStrong}>{report.totals.created}</td>
                                <td className={numStrong}>{report.totals.converted}</td>
                                <td className={numStrong}>{report.totals.pending}</td>
                                <td className={numStrong}>{report.totals.expired}</td>
                                <td className={numStrong}>{formatConversion(report.totals.conversion)}</td>
                                <td className={numStrong}>{report.totals.coinsIssued}</td>
                                <td className={numStrong}>{report.totals.coinsRedeemed}</td>
                                <td className={numStrong}>{formatCurrency(report.totals.coinsRedeemed)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <footer className="border-t border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
                Conversion % = conversions in the period ÷ referrals created in the period; the Leaderboard uses each referrer&apos;s own referrals instead.
            </footer>
        </section>
    )
}

import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { METHOD_LABELS, PAYMENT_METHODS } from '@/lib/reports/payments-aggregate'
import type { DayBookReport } from '@/lib/reports/payments'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const num = `${td} text-right tabular-nums`
const numStrong = 'px-3 py-2 text-sm text-right tabular-nums font-medium text-gray-900 dark:text-white'

const STATUS_CLASS: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    failed: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    refunded: 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300',
}

function timeOf(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

export default function DayBookTable({ report, date, gymName }: { report: DayBookReport; date: string; gymName: string }) {
    const { rows, totals } = report
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 print:border-0 print:bg-white print:text-black">
            <header className="hidden print:block print:text-black px-3 pt-3">
                <p className="text-base font-semibold">{gymName} — Payments day book</p>
                <p className="text-sm">{formatDate(date, 'EEEE, dd MMM yyyy')}</p>
            </header>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={`${th} w-10`}>#</th><th className={th}>Time</th><th className={th}>Receipt</th><th className={th}>Member</th>
                            <th className={th}>Plan</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-right`}>Admission</th>
                            <th className={`${th} text-right`}>Coins</th><th className={th}>Method</th><th className={th}>Status</th><th className={th}>Collected by</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {rows.length === 0 && (
                            <tr><td colSpan={11} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No payments on this day<span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">Use the arrows above to move between days.</span></td></tr>
                        )}
                        {rows.map((row, index) => (
                            <tr key={row.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} tabular-nums text-gray-400 dark:text-neutral-500`}>{index + 1}</td>
                                <td className={`${td} whitespace-nowrap tabular-nums`}>{timeOf(row.created_at)}</td>
                                <td className={`${td} whitespace-nowrap font-mono text-xs`}>{row.receipt_number ?? row.invoice_number ?? '—'}</td>
                                <td className={td}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-gray-900 dark:text-white">{row.member_name ?? 'Unknown'}</span>
                                        {row.is_demo && <SupportDemoBadge />}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{row.member_code}</div>
                                </td>
                                <td className={td}>{row.plan_name ?? '—'}</td>
                                <td className={`${numStrong} whitespace-nowrap`}>{formatCurrency(row.amount)}</td>
                                <td className={`${num} whitespace-nowrap`}>{row.admission_fee_amount ? formatCurrency(row.admission_fee_amount) : '—'}</td>
                                <td className={num}>{row.referral_coins_used || '—'}</td>
                                <td className={`${td} whitespace-nowrap`}>{METHOD_LABELS[row.payment_method]}</td>
                                <td className={td}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_CLASS[row.payment_status]}`}>{row.payment_status}</span></td>
                                <td className={`${td} whitespace-nowrap`}>{row.processor_name ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <footer className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 dark:border-neutral-700">
                <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {PAYMENT_METHODS.map((method) => (
                        <div key={method}>
                            <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">{METHOD_LABELS[method]}</dt>
                            <dd className="tabular-nums text-gray-900 dark:text-white">{formatCurrency(totals.byMethod[method])}</dd>
                        </div>
                    ))}
                    <div className="ml-auto text-right">
                        <dt className="text-xs font-medium text-gray-500 dark:text-neutral-400">Collected · {totals.paidCount} txn{totals.paidCount === 1 ? '' : 's'}</dt>
                        <dd className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(totals.collected)}</dd>
                    </div>
                </dl>
                {(totals.pendingCount > 0 || totals.refundedCount > 0) && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                        Not counted: {totals.pendingCount} pending/failed ({formatCurrency(totals.pendingAmount)}), {totals.refundedCount} refunded ({formatCurrency(totals.refundedAmount)}).
                    </p>
                )}
            </footer>
        </section>
    )
}

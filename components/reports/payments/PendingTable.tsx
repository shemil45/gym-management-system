import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { todayInKolkata } from '@/lib/reports/dates'
import { METHOD_LABELS, ageInDays, type ReportPaymentRow } from '@/lib/reports/payments-aggregate'
import type { PendingReport } from '@/lib/reports/payments'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'
import CopyPhoneButton from '@/components/reports/payments/CopyPhoneButton'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

function ageLabel(days: number): string {
    if (days === 0) return 'Today'
    return `${days} day${days === 1 ? '' : 's'}`
}

type SectionProps = {
    title: string
    /** One line under the title saying what the rows are. */
    caption: string
    rows: ReportPaymentRow[]
    today: string
    emptyTitle: string
    emptyHint: string
    badgeClass: string
}

function Section({ title, caption, rows, today, emptyTitle, emptyHint, badgeClass }: SectionProps) {
    const amount = rows.reduce((s, r) => s + r.amount, 0)
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <header className="border-b border-gray-200 px-3 py-2.5 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">{caption}</p>
            </header>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Date</th><th className={th}>Age</th><th className={th}>Member</th><th className={th}>Phone</th><th className={th}>Plan</th>
                            <th className={`${th} text-right`}>Amount</th><th className={th}>Method</th><th className={th}>Status</th><th className={th}>Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {rows.length === 0 && (
                            <tr><td colSpan={9} className={`${td} py-8 text-center text-gray-500 dark:text-neutral-400`}>{emptyTitle}<span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">{emptyHint}</span></td></tr>
                        )}
                        {rows.map((row) => (
                            <tr key={row.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} whitespace-nowrap`}>{formatDate(row.payment_date, 'dd MMM yyyy')}</td>
                                <td className={`${td} whitespace-nowrap tabular-nums text-gray-500 dark:text-neutral-400`} title={`Recorded ${formatDate(todayInKolkata(new Date(row.created_at)), 'dd MMM yyyy')}`}>{ageLabel(ageInDays(row, today))}</td>
                                <td className={td}>
                                    <div className="flex items-center gap-1.5"><span className="font-medium text-gray-900 dark:text-white">{row.member_name ?? 'Unknown'}</span>{row.is_demo && <SupportDemoBadge />}</div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{row.member_code}</div>
                                </td>
                                <td className={td}>{row.member_phone ? <CopyPhoneButton phone={row.member_phone} name={row.member_name ?? 'member'} /> : '—'}</td>
                                <td className={td}>{row.plan_name ?? '—'}</td>
                                <td className={numStrong}>{formatCurrency(row.amount)}</td>
                                <td className={`${td} whitespace-nowrap`}>{METHOD_LABELS[row.payment_method]}</td>
                                <td className={td}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeClass}`}>{row.payment_status}</span></td>
                                <td className={`${td} max-w-xs truncate text-gray-500 dark:text-neutral-400`} title={row.notes ?? undefined}>{row.notes ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{rows.length} {title.toLowerCase()}</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(amount)}</span>
            </footer>
        </section>
    )
}

/**
 * Pending and failed are different situations — one is money still expected,
 * the other is money that did not arrive — so they get their own tables. The
 * underlying statuses are untouched; the CSV export still lists both together.
 *
 * "Notes" is the payment's free-text note. There is no failure-reason field in
 * the database, so none is shown or inferred.
 */
export default function PendingTable({ report }: { report: PendingReport }) {
    const { split, today } = report
    return (
        <div className="space-y-4">
            <Section
                title="Pending"
                caption="Recorded but not yet paid. Age is counted from the day the payment was recorded."
                rows={split.pending}
                today={today}
                emptyTitle="Nothing pending in this period"
                emptyHint="Every payment in this range is paid, failed or refunded."
                badgeClass="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            />
            <Section
                title="Failed"
                caption="Attempts that did not complete. Notes are the payment's own note, when one was recorded."
                rows={split.failed}
                today={today}
                emptyTitle="No failed payments in this period"
                emptyHint="Every attempt in this range completed or is still pending."
                badgeClass="bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            />
        </div>
    )
}

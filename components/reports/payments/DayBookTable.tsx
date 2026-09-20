'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { METHOD_LABELS, PAYMENT_METHODS, type PaymentStatus } from '@/lib/reports/payments-aggregate'
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

type StatusFilter = 'all' | PaymentStatus
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'paid', label: 'Paid' }, { id: 'pending', label: 'Pending' }, { id: 'failed', label: 'Failed' }, { id: 'refunded', label: 'Refunded' },
]

/**
 * The operational ledger for one day. Stays a ledger on purpose — the Summary
 * tab is the analytical view. The filter bar narrows what is on screen for
 * finding a row; the footer totals are always for the whole day, and the
 * print and CSV output are unaffected by the filter.
 */
export default function DayBookTable({ report, date, gymName }: { report: DayBookReport; date: string; gymName: string }) {
    const { rows, totals } = report
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<StatusFilter>('all')

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase()
        return rows.filter((row) => {
            if (status !== 'all' && row.payment_status !== status) return false
            if (!needle) return true
            return [row.member_name, row.member_code, row.member_phone, row.plan_name, row.receipt_number, row.invoice_number, row.processor_name, row.notes]
                .some((field) => field?.toLowerCase().includes(needle))
        })
    }, [rows, search, status])
    const filtered = search.trim() !== '' || status !== 'all'

    const chip = 'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 print:border-0 print:bg-white print:text-black">
            <header className="hidden print:block print:text-black px-3 pt-3">
                <p className="text-base font-semibold">{gymName} — Payments day book</p>
                <p className="text-sm">{formatDate(date, 'EEEE, dd MMM yyyy')}</p>
            </header>

            {rows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 print:hidden dark:border-neutral-700">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-neutral-500" aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Find member, receipt, plan…"
                            aria-label="Search this day's payments"
                            className="h-8 w-56 rounded-md border border-gray-200 bg-white pl-7 pr-2 text-xs text-gray-900 placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus-visible:ring-neutral-500"
                        />
                    </label>
                    <div className="flex items-center gap-2">
                        {filtered && <span className="text-xs text-gray-500 dark:text-neutral-400">{visible.length} of {rows.length}</span>}
                        <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Status">
                            {STATUS_FILTERS.map((option) => (
                                <button key={option.id} type="button" onClick={() => setStatus(option.id)} aria-pressed={status === option.id} className={`${chip} ${status === option.id ? on : off}`}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                        {rows.length > 0 && visible.length === 0 && (
                            <tr><td colSpan={11} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No payments match<span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">Clear the search or choose another status.</span></td></tr>
                        )}
                        {visible.map((row, index) => (
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
                {filtered && <p className="mb-2 text-xs text-gray-500 dark:text-neutral-400 print:hidden">Totals are for the whole day, not the filtered rows.</p>}
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

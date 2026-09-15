import { formatCurrency } from '@/lib/utils/currency'
import { METHOD_LABELS, PAYMENT_METHODS } from '@/lib/reports/payments-aggregate'
import type { SummaryReport } from '@/lib/reports/payments'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 whitespace-nowrap'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200 whitespace-nowrap'

export default function SummaryTable({ report }: { report: SummaryReport }) {
    const { buckets } = report
    const total = buckets.reduce((t, b) => ({
        txns: t.txns + b.txns, collected: t.collected + b.collected, admissionFees: t.admissionFees + b.admissionFees,
        membershipRevenue: t.membershipRevenue + b.membershipRevenue, coinsRedeemed: t.coinsRedeemed + b.coinsRedeemed, refunded: t.refunded + b.refunded,
        byMethod: Object.fromEntries(PAYMENT_METHODS.map((m) => [m, t.byMethod[m] + b.byMethod[m]])) as typeof b.byMethod,
    }), { txns: 0, collected: 0, admissionFees: 0, membershipRevenue: 0, coinsRedeemed: 0, refunded: 0, byMethod: { cash: 0, upi: 0, card: 0, bank_transfer: 0, online: 0 } })

    const cells = (b: typeof total) => [
        b.txns, formatCurrency(b.collected), ...PAYMENT_METHODS.map((m) => formatCurrency(b.byMethod[m])),
        formatCurrency(b.admissionFees), formatCurrency(b.membershipRevenue), b.coinsRedeemed, formatCurrency(b.refunded),
    ]

    const empty = buckets.every((b) => b.txns === 0 && b.refunded === 0)

    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                    <tr>
                        <th className={`${th} text-left`}>Period</th><th className={th}>Txns</th><th className={th}>Collected</th>
                        {PAYMENT_METHODS.map((m) => <th key={m} className={th}>{METHOD_LABELS[m]}</th>)}
                        <th className={th}>Admission fees</th><th className={th}>Membership</th><th className={th}>Coins</th><th className={th}>Refunded</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {empty ? (
                        <tr><td colSpan={12} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-neutral-400">No payments in this period<span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">Choose another preset or date range above.</span></td></tr>
                    ) : (
                        buckets.map((b) => (
                            <tr key={b.start} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{b.label}</td>
                                {cells(b).map((cell, i) => <td key={i} className={td}>{cell}</td>)}
                            </tr>
                        ))
                    )}
                </tbody>
                {!empty && (
                    <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 font-semibold text-gray-900 dark:border-neutral-700 dark:text-white">
                        <tr>
                            <td className={`${td} text-left`}>Total</td>
                            {cells(total).map((cell, i) => <td key={i} className={td}>{cell}</td>)}
                        </tr>
                    </tfoot>
                )}
            </table>
        </section>
    )
}

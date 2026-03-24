'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { Receipt, ChevronLeft, ChevronRight, CreditCard, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Payment {
    id: string
    amount: number
    payment_method: string
    payment_status: 'paid' | 'pending' | 'failed' | 'refunded'
    payment_date: string
    invoice_number: string | null
    membership_start_date: string | null
    membership_end_date: string | null
    notes: string | null
}

const METHOD_LABELS: Record<string, string> = {
    cash: 'Cash', card: 'Card', upi: 'UPI',
    bank_transfer: 'Bank Transfer', online: 'Online'
}

function StatusBadge({ status }: { status: Payment['payment_status'] }) {
    const configs = {
        paid: { label: 'Paid', class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
        pending: { label: 'Pending', class: 'bg-amber-100 text-amber-700', icon: Clock },
        failed: { label: 'Failed', class: 'bg-red-100 text-red-700', icon: XCircle },
        refunded: { label: 'Refunded', class: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    }
    const cfg = configs[status]
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.class}`}>
            <Icon className="h-2.5 w-2.5" />
            {cfg.label}
        </span>
    )
}

export default function MemberPayments() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 10

    useEffect(() => {
        async function fetchPayments() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: member } = await supabase
                .from('members').select('*').eq('user_id', user.id).single() as {
                    data: { member_id: string } | null, error: unknown
                }
            if (!member) { setLoading(false); return }

            const { data } = await supabase
                .from('payments')
                .select('*')
                .eq('member_id', member.member_id)
                .order('payment_date', { ascending: false })

            setPayments((data as Payment[]) || [])
            setLoading(false)
        }
        fetchPayments()
    }, [])

    const summary = useMemo(() => {
        const totalPaid = payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + p.amount, 0)
        const lastPayment = payments.find(p => p.payment_status === 'paid')
        const pendingCount = payments.filter(p => p.payment_status === 'pending').length
        return { totalPaid, lastPayment, pendingCount }
    }, [payments])

    const paged = payments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const totalPages = Math.ceil(payments.length / PAGE_SIZE)

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>
            <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
    )

    return (
        <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Payments & Billing</h1>
                <p className="text-sm text-gray-500 mt-0.5">Your payment history and billing details</p>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 mx-auto mb-2">
                        <CreditCard className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.totalPaid)}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Total Paid</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 mx-auto mb-2">
                        <Receipt className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{payments.length}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Transactions</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 mx-auto mb-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{summary.pendingCount}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Pending</p>
                </div>
            </div>

            {/* Last payment info */}
            {summary.lastPayment && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Last Payment Received</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {formatCurrency(summary.lastPayment.amount)} · {formatDate(summary.lastPayment.payment_date)} · {METHOD_LABELS[summary.lastPayment.payment_method] || summary.lastPayment.payment_method}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Payment History ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">Payment History</h2>
                    <span className="text-xs text-gray-400">{payments.length} records</span>
                </div>

                {payments.length === 0 ? (
                    <div className="py-12 text-center">
                        <Receipt className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No payment records yet</p>
                    </div>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="grid grid-cols-5 gap-2 px-2 mb-2">
                            {['Invoice', 'Date', 'Amount', 'Method', 'Status'].map(h => (
                                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</span>
                            ))}
                        </div>

                        <div className="space-y-1">
                            {paged.map(p => (
                                <div key={p.id} className="grid grid-cols-5 gap-2 items-center rounded-lg px-2 py-2.5 hover:bg-gray-50 transition-colors">
                                    <span className="text-xs font-mono text-gray-600 truncate">{p.invoice_number || '—'}</span>
                                    <span className="text-xs text-gray-500">{formatDate(p.payment_date)}</span>
                                    <span className="text-xs font-semibold text-gray-800">{formatCurrency(p.amount)}</span>
                                    <span className="text-xs text-gray-500">{METHOD_LABELS[p.payment_method] || p.payment_method}</span>
                                    <StatusBadge status={p.payment_status} />
                                </div>
                            ))}
                        </div>

                        {/* Period details */}
                        {paged.some(p => p.membership_start_date || p.membership_end_date) && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                                {paged.filter(p => p.membership_start_date || p.membership_end_date).map(p => (
                                    <div key={`detail-${p.id}`} className="flex items-center gap-2 text-[10px] text-gray-400 px-2">
                                        <span className="font-mono">{p.invoice_number || p.id.slice(0, 8)}</span>
                                        <span>→</span>
                                        <span>
                                            {p.membership_start_date ? formatDate(p.membership_start_date) : '?'} to {p.membership_end_date ? formatDate(p.membership_end_date) : '?'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                                </button>
                                <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page === totalPages - 1}
                                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                >
                                    Next <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Contact to pay */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
                <p className="text-sm font-medium text-gray-700">Need to make a payment?</p>
                <p className="text-xs text-gray-500 mt-1">Contact the gym desk or call your gym directly to process your membership renewal.</p>
                <a href="/member/support" className="mt-3 inline-block text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                    Contact Support →
                </a>
            </div>
        </div>
    )
}

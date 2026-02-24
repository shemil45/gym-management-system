'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Search,
    Plus,
    ChevronLeft,
    ChevronRight,
    Banknote,
    TrendingUp,
    Receipt,
    Smartphone,
    CreditCard,
    Building2,
    Globe,
    Wallet,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'

const ITEMS_PER_PAGE = 20

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberSnippet {
    id: string
    member_id: string
    full_name: string
    photo_url?: string | null
    membership_plan?: { name: string } | null
}

interface PaymentRow {
    id: string
    member_id: string
    amount: number
    payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
    payment_status: 'paid' | 'pending' | 'failed' | 'refunded'
    payment_date: string
    invoice_number: string | null
    notes: string | null
    created_at: string
    member: MemberSnippet | null
}

interface PaymentsTableProps {
    payments: PaymentRow[]
    todayTotal: number
    monthTotal: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function isThisMonth(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentRow['payment_status'] }) {
    const config: Record<string, { label: string; className: string }> = {
        paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
        failed: { label: 'Failed', className: 'bg-red-50 text-red-500 border-red-200' },
        refunded: { label: 'Refunded', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    }
    const c = config[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' }
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.className}`}>
            {c.label}
        </span>
    )
}

function MethodBadge({ method }: { method: PaymentRow['payment_method'] }) {
    const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
        cash: { label: 'Cash', icon: <Banknote className="h-3 w-3" />, className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        upi: { label: 'UPI', icon: <Smartphone className="h-3 w-3" />, className: 'bg-violet-50 text-violet-700 border-violet-100' },
        card: { label: 'Card', icon: <CreditCard className="h-3 w-3" />, className: 'bg-blue-50 text-blue-700 border-blue-100' },
        bank_transfer: { label: 'Bank Transfer', icon: <Building2 className="h-3 w-3" />, className: 'bg-orange-50 text-orange-700 border-orange-100' },
        online: { label: 'Online', icon: <Globe className="h-3 w-3" />, className: 'bg-sky-50 text-sky-700 border-sky-100' },
    }
    const c = config[method] ?? { label: method, icon: <Wallet className="h-3 w-3" />, className: 'bg-gray-50 text-gray-600 border-gray-100' }
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.className}`}>
            {c.icon} {c.label}
        </span>
    )
}

function StatCard({ icon, label, value, iconBg }: { icon: React.ReactNode; label: string; value: string; iconBg: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-sm border border-gray-100">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    )
}

function PaginationBar({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
        pages.push(1)
        if (currentPage > 3) pages.push('...')
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
        if (currentPage < totalPages - 2) pages.push('...')
        pages.push(totalPages)
    }
    return (
        <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {pages.map((p, idx) =>
                p === '...' ? (
                    <span key={`e-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                    <button key={p} onClick={() => onPageChange(p as number)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${currentPage === p ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                        {p}
                    </button>
                )
            )}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentsTable({ payments, todayTotal, monthTotal }: PaymentsTableProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [methodFilter, setMethodFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)

    // Stats
    const totalRevenue = useMemo(
        () => payments.filter((p) => p.payment_status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
        [payments]
    )
    const monthRevenue = useMemo(
        () => payments.filter((p) => p.payment_status === 'paid' && isThisMonth(p.payment_date)).reduce((s, p) => s + Number(p.amount), 0),
        [payments]
    )

    // Filter
    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return payments.filter((p) => {
            const m = p.member
            const matchSearch =
                !q ||
                m?.full_name.toLowerCase().includes(q) ||
                m?.member_id.toLowerCase().includes(q) ||
                (p.invoice_number?.toLowerCase().includes(q) ?? false)
            const matchStatus = statusFilter === 'all' || p.payment_status === statusFilter
            const matchMethod = methodFilter === 'all' || p.payment_method === methodFilter
            return matchSearch && matchStatus && matchMethod
        })
    }, [payments, searchQuery, statusFilter, methodFilter])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const safePage = Math.min(currentPage, totalPages)
    const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

    const resetPage = () => setCurrentPage(1)

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track all membership payments</p>
                </div>
                <Link href="/admin/payments/record">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5 px-4">
                        <Plus className="h-4 w-4" />
                        Record Payment
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={<Banknote className="h-5 w-5 text-emerald-600" />}
                    iconBg="bg-emerald-50"
                    label="Today's Revenue"
                    value={formatCurrency(todayTotal)}
                />
                <StatCard
                    icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                    iconBg="bg-blue-50"
                    label="This Month's Revenue"
                    value={formatCurrency(monthRevenue || monthTotal)}
                />
                <StatCard
                    icon={<Receipt className="h-5 w-5 text-violet-600" />}
                    iconBg="bg-violet-50"
                    label="Total Collected"
                    value={formatCurrency(totalRevenue)}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by member name, ID or invoice..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); resetPage() }}
                        className="pl-9 bg-white border-gray-200 text-sm h-10 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage() }}>
                    <SelectTrigger className="w-full sm:w-36 h-10 bg-white border-gray-200 text-sm">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); resetPage() }}>
                    <SelectTrigger className="w-full sm:w-40 h-10 bg-white border-gray-200 text-sm">
                        <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="py-3 pl-5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-12">
                                    Member
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Invoice</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Method</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-3 py-3 pr-5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Plan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                                        No payments found
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((payment) => {
                                    const member = payment.member
                                    const name = member?.full_name ?? 'Unknown'
                                    return (
                                        <tr key={payment.id} className="hover:bg-emerald-50/20 transition-colors">
                                            {/* Avatar */}
                                            <td className="py-3 pl-5 pr-3">
                                                <Avatar className="h-9 w-9 ring-2 ring-gray-100">
                                                    <AvatarImage src={member?.photo_url || undefined} alt={name} />
                                                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs font-semibold">
                                                        {getInitials(name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </td>
                                            {/* Name + Member ID */}
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-gray-800">{name}</p>
                                                <p className="text-[11px] text-gray-400">{member?.member_id ?? '—'}</p>
                                            </td>
                                            {/* Invoice */}
                                            <td className="px-3 py-3">
                                                <span className="font-mono text-xs text-gray-500">
                                                    {payment.invoice_number ?? '—'}
                                                </span>
                                            </td>
                                            {/* Date */}
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(payment.payment_date)}
                                                </span>
                                            </td>
                                            {/* Amount */}
                                            <td className="px-3 py-3 text-right">
                                                <span className={`text-sm font-semibold ${payment.payment_status === 'paid' ? 'text-emerald-600' : payment.payment_status === 'refunded' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                    {formatCurrency(Number(payment.amount))}
                                                </span>
                                            </td>
                                            {/* Method */}
                                            <td className="px-3 py-3">
                                                <MethodBadge method={payment.payment_method} />
                                            </td>
                                            {/* Status */}
                                            <td className="px-3 py-3">
                                                <StatusBadge status={payment.payment_status} />
                                            </td>
                                            {/* Plan */}
                                            <td className="px-3 py-3 pr-5">
                                                <span className="text-sm text-gray-500">
                                                    {member?.membership_plan?.name ?? '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 px-5 py-3">
                    <p className="text-xs text-gray-500">
                        Showing{' '}
                        <span className="font-semibold text-emerald-600">
                            {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–
                            {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                        </span>
                        {' '}of{' '}
                        <span className="font-medium text-gray-700">{filtered.length}</span> payments
                    </p>
                    {totalPages > 1 && (
                        <PaginationBar
                            currentPage={safePage}
                            totalPages={totalPages}
                            onPageChange={(p) => { if (p >= 1 && p <= totalPages) setCurrentPage(p) }}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

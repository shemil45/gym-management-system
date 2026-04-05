'use client'

import { useState, useMemo, useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
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
    SlidersHorizontal,
    X,
    Loader2,
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
    membership_start_date?: string | null
    membership_expiry_date?: string | null
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
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

function isThisMonth(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentRow['payment_status'] }) {
    const config: Record<string, { label: string; className: string }> = {
        paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
        pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
        failed: { label: 'Failed', className: 'bg-red-50 text-red-500 border border-red-200' },
        refunded: { label: 'Refunded', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
    }
    const c = config[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border border-gray-200' }
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.className}`}>
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

function StatCard({
    icon,
    label,
    value,
    iconBg,
}: {
    icon: React.ReactNode
    label: string
    value: string
    iconBg: string
}) {
    return (
        <div className="flex flex-1 items-start gap-2 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
            <div className={`mt-0.5 flex h-10 w-9 shrink-0 items-center justify-center rounded-sm ${iconBg}`}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="min-w-0 truncate text-[10.5px] font-medium leading-4 text-slate-400">{label}</p>
                <p className="mt-1 text-left text-[1.05rem] font-bold leading-tight text-slate-900 sm:text-[1.15rem]">{value}</p>
            </div>
        </div>
    )
}

function PaginationBar({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number
    totalPages: number
    onPageChange: (p: number) => void
}) {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
        pages.push(1)
        if (currentPage > 3) pages.push('...')
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pages.push(i)
        }
        if (currentPage < totalPages - 2) pages.push('...')
        pages.push(totalPages)
    }
    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {pages.map((p, idx) =>
                p === '...' ? (
                    <span key={`e-${idx}`} className="px-2 text-xs text-gray-400">
                        …
                    </span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                            currentPage === p
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentsTable({ payments, todayTotal, monthTotal }: PaymentsTableProps) {
    const router = useRouter()
    const [openingRecordPayment, setOpeningRecordPayment] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [navigatingInvoiceId, setNavigatingInvoiceId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [methodFilter, setMethodFilter] = useState('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [showFilterModal, setShowFilterModal] = useState(false)

    // Draft state for modal
    const [draftStatus, setDraftStatus] = useState('all')
    const [draftMethod, setDraftMethod] = useState('all')
    const [draftDateFrom, setDraftDateFrom] = useState('')
    const [draftDateTo, setDraftDateTo] = useState('')
    const [dateError, setDateError] = useState('')

    // Lock body scroll when modal is open
    useEffect(() => {
        if (showFilterModal) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [showFilterModal])

    // Stats
    const totalRevenue = useMemo(
        () => payments.filter((p) => p.payment_status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
        [payments]
    )
    const monthRevenue = useMemo(
        () =>
            payments
                .filter((p) => p.payment_status === 'paid' && isThisMonth(p.payment_date))
                .reduce((s, p) => s + Number(p.amount), 0),
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
            const matchDateFrom = !dateFrom || p.payment_date >= dateFrom
            const matchDateTo = !dateTo || p.payment_date <= dateTo
            return matchSearch && matchStatus && matchMethod && matchDateFrom && matchDateTo
        })
    }, [payments, searchQuery, statusFilter, methodFilter, dateFrom, dateTo])

    const sortedFiltered = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const aTs = new Date(a.created_at || a.payment_date).getTime()
            const bTs = new Date(b.created_at || b.payment_date).getTime()
            return bTs - aTs
        })
    }, [filtered])

    const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE))
    const safePage = Math.min(currentPage, totalPages)
    const paginated = sortedFiltered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

    const resetPage = () => setCurrentPage(1)

    const handleRowClick = (paymentId: string, invoiceNumber: string | null, status: string) => {
        if (!invoiceNumber || navigatingInvoiceId) return
        setNavigatingInvoiceId(paymentId)
        const invoiceStatus = status === 'paid' ? 'success' : 'failure'
        startTransition(() => {
            router.push(`/invoice?portal=admin&invoice=${encodeURIComponent(invoiceNumber)}&status=${invoiceStatus}`)
        })
    }

    const handleOpenRecordPayment = () => {
        setOpeningRecordPayment(true)
        startTransition(() => {
            router.push('/admin/payments/record')
        })
    }

    const hasActiveFilters = statusFilter !== 'all' || methodFilter !== 'all' || !!dateFrom || !!dateTo
    const activeFilterCount =
        (statusFilter !== 'all' ? 1 : 0) +
        (methodFilter !== 'all' ? 1 : 0) +
        ((dateFrom || dateTo) ? 1 : 0)

    const handleOpenFilterModal = () => {
        setDraftStatus(statusFilter)
        setDraftMethod(methodFilter)
        setDraftDateFrom(dateFrom)
        setDraftDateTo(dateTo)
        setDateError('')
        setShowFilterModal(true)
    }

    const handleApplyFilters = () => {
        if (draftDateFrom && draftDateTo && draftDateTo < draftDateFrom) {
            setDateError('"To" date cannot be earlier than "From" date.')
            return
        }

        setStatusFilter(draftStatus)
        setMethodFilter(draftMethod)
        setDateFrom(draftDateFrom)
        setDateTo(draftDateTo)
        resetPage()
        setDateError('')
        setShowFilterModal(false)
    }

    const handleResetDraft = () => {
        setDraftStatus('all')
        setDraftMethod('all')
        setDraftDateFrom('')
        setDraftDateTo('')
        setDateError('')
    }

    const handleClearAllFilters = () => {
        setStatusFilter('all')
        setMethodFilter('all')
        setDateFrom('')
        setDateTo('')
        resetPage()
    }

    return (
        <div className="space-y-5">
            {/* ── Filter Modal ── */}
            {showFilterModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
                    onClick={() => setShowFilterModal(false)}
                >
                    <div
                        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)] max-h-[88vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                                    <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                                </div>
                                <h2 className="text-base font-semibold text-slate-800">Filter Payments</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFilterModal(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">Payment Status</label>
                                <Select value={draftStatus} onValueChange={setDraftStatus}>
                                    <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-sm">
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
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">Payment Method</label>
                                <Select value={draftMethod} onValueChange={setDraftMethod}>
                                    <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-sm">
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

                            <div className="rounded-xl bg-slate-50 p-3 shadow-sm">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Payment Date Range</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-500">From</label>
                                            {draftDateFrom && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDraftDateFrom('')}
                                                    className="rounded px-1 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>
                                        <Input
                                            type="date"
                                            value={draftDateFrom}
                                            onChange={(e) => setDraftDateFrom(e.target.value)}
                                            className="h-10 w-[90%] rounded-xl border-slate-200 bg-white text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-500">To</label>
                                            {draftDateTo && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDraftDateTo('')}
                                                    className="rounded px-1 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>
                                        <Input
                                            type="date"
                                            value={draftDateTo}
                                            onChange={(e) => setDraftDateTo(e.target.value)}
                                            className="h-10 w-[90%] rounded-xl border-slate-200 bg-white text-sm"
                                        />
                                    </div>
                                </div>
                                {dateError && (
                                    <p className="mt-2 text-xs font-medium text-red-500">{dateError}</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={handleResetDraft}
                                className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
                            >
                                Reset all
                            </button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowFilterModal(false)}
                                    className="h-10 rounded-xl border-slate-200 text-sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    className="h-10 rounded-xl bg-emerald-600 px-5 text-sm text-white hover:bg-emerald-700"
                                >
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header Card ── */}
            <div className="rounded-[1.75rem] bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 sm:p-5">
                {/* Title + CTA */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Payments</h1>
                        <p className="mt-1 text-sm text-slate-400">Track and manage all membership payments.</p>
                    </div>
                    <Button
                        type="button"
                        onClick={handleOpenRecordPayment}
                        disabled={openingRecordPayment}
                        className="h-14 w-14 shrink-0 rounded-full bg-emerald-600 p-0 text-white shadow-[0_16px_32px_rgba(5,150,105,0.25)] hover:bg-emerald-700 sm:h-14 sm:w-auto sm:rounded-2xl sm:px-4 gap-1.5"
                    >
                        {openingRecordPayment ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        <span className="ml-1 hidden sm:inline">{openingRecordPayment ? 'Opening...' : 'Record Payment'}</span>
                    </Button>
                </div>

                {/* Stat Cards */}
                <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            icon={<Banknote className="h-4.5 w-4.5 text-emerald-600" />}
                            iconBg="bg-emerald-50"
                            label="Today's Revenue"
                            value={formatCurrency(todayTotal)}
                        />
                        <StatCard
                            icon={<TrendingUp className="h-4.5 w-4.5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            label="This Month"
                            value={formatCurrency(monthRevenue || monthTotal)}
                        />
                    </div>
                    <StatCard
                        icon={<Receipt className="h-4.5 w-4.5 text-violet-600" />}
                        iconBg="bg-violet-50"
                        label="Total Collected"
                        value={formatCurrency(totalRevenue)}
                    />
                </div>
            </div>

            {/* ── Payment List / Table ── */}
            <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
                {/* Search + Filter Header */}
                <div className="border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex gap-2 sm:gap-3">
                        <div className="relative flex-3 min-w-0">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by name, ID or invoice..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    resetPage()
                                }}
                                className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm focus:border-emerald-400 focus:ring-emerald-400"
                            />
                        </div>

                        <div className="relative flex flex-1 items-center gap-1.5 sm:gap-2 min-w-fit">
                            <button
                                type="button"
                                onClick={handleOpenFilterModal}
                                className="flex h-12 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 sm:px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 min-w-0"
                            >
                                <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500" />
                                <span className="hidden xl:inline whitespace-nowrap">Filter</span>
                                {hasActiveFilters && (
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleClearAllFilters}
                                    className="flex h-12 w-12 sm:w-auto shrink-0 items-center justify-center rounded-2xl bg-red-50 px-0 sm:px-3 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                                    title="Clear filters"
                                >
                                    <X className="h-4 w-4 shrink-0" />
                                    <span className="hidden sm:inline ml-1 font-semibold whitespace-nowrap">Clear</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Cards (hidden on lg+) */}
                <div className="divide-y divide-slate-100 lg:hidden">
                    {paginated.length === 0 ? (
                        <div className="px-4 py-16 text-center text-sm text-slate-400">No payments found</div>
                    ) : (
                        paginated.map((payment) => {
                            const member = payment.member
                            const name = member?.full_name ?? 'Unknown'
                            const isPaid = payment.payment_status === 'paid'
                            const isRefunded = payment.payment_status === 'refunded'
                            const isNavigating = navigatingInvoiceId === payment.id
                            const membershipRange =
                                member?.membership_start_date && member?.membership_expiry_date
                                    ? `${formatDate(member.membership_start_date)} - ${formatDate(member.membership_expiry_date)}`
                                    : member?.membership_start_date
                                        ? `From ${formatDate(member.membership_start_date)}`
                                        : member?.membership_expiry_date
                                            ? `Until ${formatDate(member.membership_expiry_date)}`
                                            : 'Membership period unavailable'
                            return (
                                <div 
                                    key={payment.id} 
                                    onClick={() => handleRowClick(payment.id, payment.invoice_number, payment.payment_status)} 
                                    className={`relative px-4 py-3.5 transition-colors cursor-pointer ${isNavigating ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                                >
                                    {isNavigating && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
                                            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                                        </div>
                                    )}
                                    <div className={`flex items-start gap-3 ${isNavigating ? 'opacity-40' : ''}`}>
                                        <Avatar className="h-11 w-11 shrink-0 ring-2 ring-slate-100">
                                            <AvatarImage src={member?.photo_url || undefined} alt={name} />
                                            <AvatarFallback className="bg-linear-to-br from-emerald-500 to-teal-500 text-xs font-semibold text-white">
                                                {getInitials(name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="min-w-0 flex-1">
                                            {/* Row 1: Name + payment date/time */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-[15px] font-medium leading-tight text-slate-800">
                                                        {name}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-400">
                                                        {member?.member_id ?? '—'}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-[11px] font-medium leading-tight text-slate-500">
                                                        {formatDate(payment.payment_date)}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] leading-tight text-slate-400">
                                                        {formatTime(payment.created_at || payment.payment_date)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Row 2: Membership period + amount */}
                                            <div className="mt-1 flex items-center justify-between gap-2">
                                                <p className="min-w-0 truncate text-[12px] leading-tight text-slate-400">
                                                    {membershipRange}
                                                </p>
                                                <p
                                                    className={`shrink-0 text-[15px] font-bold leading-tight ${
                                                        isPaid
                                                            ? 'text-emerald-600'
                                                            : isRefunded
                                                                ? 'text-slate-400 line-through'
                                                                : 'text-slate-800'
                                                    }`}
                                                >
                                                    {formatCurrency(Number(payment.amount))}
                                                </p>
                                            </div>

                                            {/* Row 3: Invoice */}
                                            {payment.invoice_number && (
                                                <p className="mt-1 font-mono text-[11px] text-slate-400">
                                                    {payment.invoice_number}
                                                </p>
                                            )}

                                            {/* Row 4: Method + Status */}
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <MethodBadge method={payment.payment_method} />
                                                <StatusBadge status={payment.payment_status} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Desktop Table (hidden below lg) */}
                <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="w-12 py-3 pl-5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Member
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Name
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Invoice
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Date
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Amount
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Method
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Status
                                </th>
                                <th className="px-3 py-3 pr-5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Plan
                                </th>
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
                                    const isNavigating = navigatingInvoiceId === payment.id
                                    return (
                                        <tr 
                                            key={payment.id} 
                                            onClick={() => handleRowClick(payment.id, payment.invoice_number, payment.payment_status)} 
                                            className={`transition-colors cursor-pointer ${isNavigating ? 'bg-emerald-50/60' : 'hover:bg-emerald-50/20'}`}
                                        >
                                            <td className="py-3 pl-5 pr-3">
                                                <Avatar className="h-9 w-9 ring-2 ring-gray-100">
                                                    <AvatarImage src={member?.photo_url || undefined} alt={name} />
                                                    <AvatarFallback className="bg-linear-to-br from-emerald-500 to-teal-500 text-white text-xs font-semibold">
                                                        {getInitials(name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-gray-800">{name}</p>
                                                <p className="text-[11px] text-gray-400">{member?.member_id ?? '—'}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="font-mono text-xs text-gray-500">
                                                    {payment.invoice_number ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(payment.payment_date)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <span
                                                    className={`text-sm font-semibold ${
                                                        payment.payment_status === 'paid'
                                                            ? 'text-emerald-600'
                                                            : payment.payment_status === 'refunded'
                                                            ? 'text-gray-400 line-through'
                                                            : 'text-gray-800'
                                                    }`}
                                                >
                                                    {formatCurrency(Number(payment.amount))}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <MethodBadge method={payment.payment_method} />
                                            </td>
                                            <td className="px-3 py-3">
                                                <StatusBadge status={payment.payment_status} />
                                            </td>
                                            <td className="px-3 py-3 pr-5" onClick={(e) => e.stopPropagation()}>
                                                {isNavigating ? (
                                                    <div className="flex items-center justify-end pr-1">
                                                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500">
                                                        {member?.membership_plan?.name ?? '—'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500">
                        Showing{' '}
                        <span className="font-semibold text-emerald-600">
                            {sortedFiltered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–
                            {Math.min(safePage * ITEMS_PER_PAGE, sortedFiltered.length)}
                        </span>{' '}
                        of <span className="font-medium text-gray-700">{sortedFiltered.length}</span> payments
                    </p>
                    {totalPages > 1 && (
                        <div className="sm:ml-auto">
                            <PaginationBar
                                currentPage={safePage}
                                totalPages={totalPages}
                                onPageChange={(p) => {
                                    if (p >= 1 && p <= totalPages) setCurrentPage(p)
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
    LogIn,
    LogOut,
    ChevronLeft,
    ChevronRight,
    X,
    Clock,
    UserCheck,
    CalendarDays,
    Fingerprint,
    QrCode,
    Monitor,
    Hand,
} from 'lucide-react'
import { toast } from 'sonner'

const ITEMS_PER_PAGE = 20

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberSnippet {
    id: string
    member_id: string
    full_name: string
    photo_url?: string | null
    status: string
    membership_plan?: { name: string } | null
}

interface CheckInRow {
    id: string
    member_id: string
    check_in_time: string
    check_out_time: string | null
    entry_method: 'manual' | 'qr' | 'kiosk' | 'fingerprint'
    notes: string | null
    member: MemberSnippet | null
}

interface CheckInsTableProps {
    checkIns: CheckInRow[]
    activeMembers: {
        id: string
        member_id: string
        full_name: string
        photo_url?: string | null
        status: string
    }[]
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

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    })
}

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    })
}

function calcDuration(checkIn: string, checkOut: string | null) {
    if (!checkOut) return null
    const mins = Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000
    )
    if (mins < 0) return null
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function isToday(iso: string) {
    const d = new Date(iso).toDateString()
    return d === new Date().toDateString()
}

function isThisWeek(iso: string) {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return new Date(iso) >= weekAgo
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EntryMethodBadge({ method }: { method: CheckInRow['entry_method'] }) {
    const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
        manual: {
            label: 'Manual',
            icon: <Hand className="h-3 w-3" />,
            className: 'bg-blue-50 text-blue-600 border-blue-100',
        },
        qr: {
            label: 'QR',
            icon: <QrCode className="h-3 w-3" />,
            className: 'bg-violet-50 text-violet-600 border-violet-100',
        },
        kiosk: {
            label: 'Kiosk',
            icon: <Monitor className="h-3 w-3" />,
            className: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        fingerprint: {
            label: 'Fingerprint',
            icon: <Fingerprint className="h-3 w-3" />,
            className: 'bg-orange-50 text-orange-600 border-orange-100',
        },
    }
    const c = config[method] ?? { label: method, icon: null, className: 'bg-gray-50 text-gray-600 border-gray-100' }
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.className}`}
        >
            {c.icon}
            {c.label}
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
    value: number | string
    iconBg: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-sm border border-gray-100">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
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
        for (
            let i = Math.max(2, currentPage - 1);
            i <= Math.min(totalPages - 1, currentPage + 1);
            i++
        ) { pages.push(i) }
        if (currentPage < totalPages - 2) pages.push('...')
        pages.push(totalPages)
    }
    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {pages.map((p, idx) =>
                p === '...' ? (
                    <span key={`e-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${currentPage === p
                            ? 'bg-blue-600 text-white shadow-sm'
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
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
                Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

// ─── Manual Check-in Modal ────────────────────────────────────────────────────

function CheckInModal({
    members,
    onClose,
    onSuccess,
}: {
    members: CheckInsTableProps['activeMembers']
    onClose: () => void
    onSuccess: () => void
}) {
    const [search, setSearch] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        searchRef.current?.focus()
    }, [])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return members.filter(
            (m) =>
                m.full_name.toLowerCase().includes(q) ||
                m.member_id.toLowerCase().includes(q)
        )
    }, [members, search])

    const selected = members.find((m) => m.id === selectedId) ?? null

    const handleSubmit = async () => {
        if (!selectedId) return
        setSubmitting(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.from('check_ins').insert({
                member_id: selectedId,
                entry_method: 'manual',
                notes: notes.trim() || null,
            })
            if (error) throw error
            toast.success(`${selected?.full_name} checked in successfully`)
            onSuccess()
            onClose()
        } catch {
            toast.error('Failed to record check-in')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                            <LogIn className="h-4 w-4 text-violet-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">Manual Check-in</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Member search */}
                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                            Select Member
                        </label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Search by name or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 transition-colors"
                            />
                        </div>
                        <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <p className="py-6 text-center text-xs text-gray-400">No active members found</p>
                            ) : (
                                filtered.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedId(m.id)}
                                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${selectedId === m.id
                                            ? 'bg-violet-50'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <Avatar className="h-7 w-7 shrink-0">
                                            <AvatarImage src={m.photo_url || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-[10px] font-semibold">
                                                {getInitials(m.full_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium text-gray-800">
                                                {m.full_name}
                                            </p>
                                            <p className="text-[10px] text-gray-400">{m.member_id}</p>
                                        </div>
                                        {selectedId === m.id && (
                                            <div className="h-4 w-4 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                                                <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                                                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                            Notes <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Any notes about this visit..."
                            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 transition-colors"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedId || submitting}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <LogIn className="h-3.5 w-3.5" />
                        {submitting ? 'Checking in…' : 'Check In'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CheckInsTable({ checkIns, activeMembers }: CheckInsTableProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('today')
    const [methodFilter, setMethodFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [checkingOutId, setCheckingOutId] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)

    // ── Stats ────────────────────────────────────────────────
    const todayCount = useMemo(() => checkIns.filter((c) => isToday(c.check_in_time)).length, [checkIns])
    const currentlyIn = useMemo(
        () => checkIns.filter((c) => isToday(c.check_in_time) && !c.check_out_time).length,
        [checkIns]
    )
    const weekCount = useMemo(() => checkIns.filter((c) => isThisWeek(c.check_in_time)).length, [checkIns])

    // ── Filtered rows ────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return checkIns.filter((c) => {
            const member = c.member
            const matchSearch =
                !q ||
                member?.full_name.toLowerCase().includes(q) ||
                member?.member_id.toLowerCase().includes(q)
            const matchDate =
                dateFilter === 'all'
                    ? true
                    : dateFilter === 'today'
                        ? isToday(c.check_in_time)
                        : isThisWeek(c.check_in_time)
            const matchMethod = methodFilter === 'all' || c.entry_method === methodFilter
            return matchSearch && matchDate && matchMethod
        })
    }, [checkIns, searchQuery, dateFilter, methodFilter])

    // ── Pagination ───────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const safePage = Math.min(currentPage, totalPages)
    const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

    const resetPage = () => setCurrentPage(1)

    // ── Check-out ────────────────────────────────────────────
    const handleCheckOut = async (id: string, memberName: string) => {
        setCheckingOutId(id)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('check_ins')
                .update({ check_out_time: new Date().toISOString() })
                .eq('id', id)
            if (error) throw error
            toast.success(`${memberName} checked out`)
            router.refresh()
        } catch {
            toast.error('Failed to record check-out')
        } finally {
            setCheckingOutId(null)
        }
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Check-ins</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track member gym visits</p>
                </div>
                <Button
                    onClick={() => setShowModal(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm gap-1.5 px-4"
                >
                    <Plus className="h-4 w-4" />
                    Manual Check-in
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
                    iconBg="bg-blue-50"
                    label="Today's Check-ins"
                    value={todayCount}
                />
                <StatCard
                    icon={<UserCheck className="h-5 w-5 text-violet-600" />}
                    iconBg="bg-violet-50"
                    label="Currently in Gym"
                    value={currentlyIn}
                />
                <StatCard
                    icon={<Clock className="h-5 w-5 text-emerald-600" />}
                    iconBg="bg-emerald-50"
                    label="This Week's Visits"
                    value={weekCount}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by member name or ID..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); resetPage() }}
                        className="pl-9 bg-white border-gray-200 text-sm h-10 focus:border-violet-400 focus:ring-violet-400"
                    />
                </div>

                {/* Date filter */}
                <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-1 shrink-0">
                    {(['today', 'week', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => { setDateFilter(f); resetPage() }}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${dateFilter === f
                                ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All Time'}
                        </button>
                    ))}
                </div>

                {/* Entry method filter */}
                <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); resetPage() }}>
                    <SelectTrigger className="w-full sm:w-40 h-10 bg-white border-gray-200 text-sm">
                        <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="qr">QR Code</SelectItem>
                        <SelectItem value="kiosk">Kiosk</SelectItem>
                        <SelectItem value="fingerprint">Fingerprint</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="py-3 pl-5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-16">
                                    Member
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Name
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Plan
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Check-in
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Check-out
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Duration
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Method
                                </th>
                                <th className="px-3 py-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                                        No check-ins found
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((row) => {
                                    const member = row.member
                                    const name = member?.full_name ?? 'Unknown'
                                    const initials = getInitials(name)
                                    const duration = calcDuration(row.check_in_time, row.check_out_time)
                                    const stillIn = !row.check_out_time

                                    return (
                                        <tr
                                            key={row.id}
                                            className={`hover:bg-violet-50/30 transition-colors group ${stillIn ? 'bg-emerald-50/20' : ''}`}
                                        >
                                            {/* Avatar */}
                                            <td className="py-3 pl-5 pr-3">
                                                <div className="relative inline-block">
                                                    <Avatar className="h-9 w-9 ring-2 ring-gray-100">
                                                        <AvatarImage src={member?.photo_url || undefined} alt={name} />
                                                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xs font-semibold">
                                                            {initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {stillIn && (
                                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Name + ID */}
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-gray-800">{name}</p>
                                                <p className="text-[11px] text-gray-400">{member?.member_id ?? '—'}</p>
                                            </td>

                                            {/* Plan */}
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-500">
                                                    {member?.membership_plan?.name ?? '—'}
                                                </span>
                                            </td>

                                            {/* Check-in time */}
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-gray-800">
                                                    {formatTime(row.check_in_time)}
                                                </p>
                                                <p className="text-[11px] text-gray-400">
                                                    {new Date(row.check_in_time).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                    })}
                                                </p>
                                            </td>

                                            {/* Check-out time */}
                                            <td className="px-3 py-3">
                                                {row.check_out_time ? (
                                                    <>
                                                        <p className="text-sm text-gray-800">
                                                            {formatTime(row.check_out_time)}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400">
                                                            {new Date(row.check_out_time).toLocaleDateString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                            })}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        In gym
                                                    </span>
                                                )}
                                            </td>

                                            {/* Duration */}
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-500">{duration ?? '—'}</span>
                                            </td>

                                            {/* Method */}
                                            <td className="px-3 py-3">
                                                <EntryMethodBadge method={row.entry_method} />
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-3 pr-5">
                                                <div className="flex items-center justify-end">
                                                    {stillIn && (
                                                        <button
                                                            title="Check out"
                                                            disabled={checkingOutId === row.id}
                                                            onClick={() => handleCheckOut(row.id, name)}
                                                            className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[11px] font-medium text-orange-600 hover:bg-orange-100 disabled:opacity-40 transition-colors"
                                                        >
                                                            <LogOut className="h-3 w-3" />
                                                            {checkingOutId === row.id ? 'Saving…' : 'Check-out'}
                                                        </button>
                                                    )}
                                                </div>
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
                        <span className="font-semibold text-violet-600">
                            {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–
                            {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-gray-700">{filtered.length}</span> check-ins
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

            {/* Manual check-in modal */}
            {showModal && (
                <CheckInModal
                    members={activeMembers}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => router.refresh()}
                />
            )}
        </div>
    )
}

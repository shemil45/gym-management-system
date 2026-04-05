'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
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
    Eye,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    SlidersHorizontal,
    X,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { toast } from 'sonner'

const ITEMS_PER_PAGE = 20

interface Member {
    id: string
    member_id: string
    full_name: string
    phone: string
    email?: string | null
    photo_url?: string | null
    status: string
    gender?: string | null
    membership_start_date?: string | null
    membership_expiry_date?: string | null
    membership_plan_id?: string | null
    membership_plan?: { id: string; name: string } | null
}

interface MembersTableProps {
    members: Member[]
    plans: { id: string; name: string }[]
}

function getPlanColor(name: string): string {
    const lower = name.toLowerCase()
    if (lower.includes('premium')) return 'text-orange-500'
    if (lower.includes('basic')) return 'text-gray-700'
    if (lower.includes('standard')) return 'text-gray-600'
    if (lower.includes('annual') || lower.includes('yearly')) return 'text-violet-500'
    return 'text-emerald-600'
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        active: {
            label: 'Active',
            className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        },
        inactive: {
            label: 'Inactive',
            className: 'bg-gray-100 text-gray-600 border border-gray-200',
        },
        frozen: {
            label: 'Frozen',
            className: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
        },
        expired: {
            label: 'Expired',
            className: 'bg-red-50 text-red-500 border border-red-200',
        },
    }
    const { label, className } = config[status] ?? {
        label: status,
        className: 'bg-gray-100 text-gray-600 border border-gray-200',
    }
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
            {label}
        </span>
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
                    <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400">
                        ...
                    </span>
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
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

export default function MembersTable({ members, plans }: MembersTableProps) {
    const router = useRouter()
    const { confirm, dialog } = useConfirmDialog()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [planFilter, setPlanFilter] = useState('all')
    const [genderFilter, setGenderFilter] = useState('all')
    const [startFrom, setStartFrom] = useState('')
    const [startTo, setStartTo] = useState('')
    const [endFrom, setEndFrom] = useState('')
    const [endTo, setEndTo] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [openingAddMember, setOpeningAddMember] = useState(false)
    const [navigatingMemberId, setNavigatingMemberId] = useState<string | null>(null)
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)

    // Draft state — only committed to real filters on "Apply Search"
    const [draftStatus, setDraftStatus] = useState('all')
    const [draftPlan, setDraftPlan] = useState('all')
    const [draftGender, setDraftGender] = useState('all')
    const [draftStartFrom, setDraftStartFrom] = useState('')
    const [draftStartTo, setDraftStartTo] = useState('')
    const [draftEndFrom, setDraftEndFrom] = useState('')
    const [draftEndTo, setDraftEndTo] = useState('')
    const [dateError, setDateError] = useState('')

    useEffect(() => {
        router.prefetch('/admin/members/add')
    }, [router])

    // Lock body scroll when modal is open so nothing bleeds through
    useEffect(() => {
        if (showAdvancedSearch) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [showAdvancedSearch])

    const filtered = useMemo(() => {
        return members.filter((member) => {
            const q = searchQuery.toLowerCase()
            const matchesSearch =
                member.full_name.toLowerCase().includes(q) ||
                member.member_id.toLowerCase().includes(q) ||
                member.phone.includes(q) ||
                (member.email?.toLowerCase().includes(q) ?? false)
            const matchesStatus = statusFilter === 'all' || member.status === statusFilter
            const matchesPlan = planFilter === 'all' || member.membership_plan_id === planFilter
            const matchesGender = genderFilter === 'all' || (member.gender || '').toLowerCase() === genderFilter
            const startDate = member.membership_start_date || ''
            const endDate = member.membership_expiry_date || ''
            const matchesStartFrom = !startFrom || (startDate && startDate >= startFrom)
            const matchesStartTo = !startTo || (startDate && startDate <= startTo)
            const matchesEndFrom = !endFrom || (endDate && endDate >= endFrom)
            const matchesEndTo = !endTo || (endDate && endDate <= endTo)
            return (
                matchesSearch &&
                matchesStatus &&
                matchesPlan &&
                matchesGender &&
                matchesStartFrom &&
                matchesStartTo &&
                matchesEndFrom &&
                matchesEndTo
            )
        })
    }, [members, searchQuery, statusFilter, planFilter, genderFilter, startFrom, startTo, endFrom, endTo])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const safePage = Math.min(currentPage, totalPages)
    const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page)
    }

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        setCurrentPage(1)
    }
    // Open modal seeded from currently-applied values
    const handleOpenAdvancedSearch = () => {
        setDraftStatus(statusFilter)
        setDraftPlan(planFilter)
        setDraftGender(genderFilter)
        setDraftStartFrom(startFrom)
        setDraftStartTo(startTo)
        setDraftEndFrom(endFrom)
        setDraftEndTo(endTo)
        setDateError('')
        setShowAdvancedSearch(true)
    }

    // Validate pairs then commit draft → real filter state
    const handleApplyAdvancedSearch = () => {
        if ((draftStartFrom && !draftStartTo) || (!draftStartFrom && draftStartTo)) {
            setDateError('Both "Start From" and "Start To" must be filled together.')
            return
        }
        if ((draftEndFrom && !draftEndTo) || (!draftEndFrom && draftEndTo)) {
            setDateError('Both "End From" and "End To" must be filled together.')
            return
        }
        setStatusFilter(draftStatus)
        setPlanFilter(draftPlan)
        setGenderFilter(draftGender)
        setStartFrom(draftStartFrom)
        setStartTo(draftStartTo)
        setEndFrom(draftEndFrom)
        setEndTo(draftEndTo)
        setCurrentPage(1)
        setDateError('')
        setShowAdvancedSearch(false)
    }

    const handleResetDraft = () => {
        setDraftStatus('all')
        setDraftPlan('all')
        setDraftGender('all')
        setDraftStartFrom('')
        setDraftStartTo('')
        setDraftEndFrom('')
        setDraftEndTo('')
        setDateError('')
    }

    const hasActiveAdvancedFilters =
        statusFilter !== 'all' ||
        planFilter !== 'all' ||
        genderFilter !== 'all' ||
        !!startFrom || !!startTo || !!endFrom || !!endTo

    const activeFilterCount =
        (statusFilter !== 'all' ? 1 : 0) +
        (planFilter !== 'all' ? 1 : 0) +
        (genderFilter !== 'all' ? 1 : 0) +
        (startFrom || startTo ? 1 : 0) +
        (endFrom || endTo ? 1 : 0)

    const handleClearAllFilters = () => {
        setStatusFilter('all')
        setPlanFilter('all')
        setGenderFilter('all')
        setStartFrom('')
        setStartTo('')
        setEndFrom('')
        setEndTo('')
        setCurrentPage(1)
    }

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Delete member?',
            description: `Delete member "${name}"? This cannot be undone.`,
            confirmLabel: 'Delete',
            tone: 'danger',
        })
        if (!confirmed) return

        setDeletingId(id)
        try {
            const supabase = createClient()
            const { error } = await supabase.from('members').delete().eq('id', id)
            if (error) throw error
            toast.success(`${name} deleted`)
            router.refresh()
        } catch {
            toast.error('Failed to delete member')
        } finally {
            setDeletingId(null)
        }
    }

    const handleOpenAddMember = () => {
        setOpeningAddMember(true)
        startTransition(() => {
            router.push('/admin/members/add')
        })
    }

    const handleViewMember = (id: string) => {
        if (navigatingMemberId) return
        setNavigatingMemberId(id)
        startTransition(() => {
            router.push(`/admin/members/${id}`)
        })
    }

    return (
        <div className="space-y-5">
            {dialog}

            {/* ── Advanced Search Modal ── */}
            {showAdvancedSearch && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
                    onClick={() => setShowAdvancedSearch(false)}
                >
                    {/* Modal card — no border, rich shadow, scrollbar hidden */}
                    <div
                        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)] max-h-[88vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                                </div>
                                <h2 className="text-base font-semibold text-slate-800">Advanced Search</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAdvancedSearch(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="space-y-3">
                            {/* Status + Plan in 2-col grid, Gender full-width below */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500">Status</label>
                                        <Select value={draftStatus} onValueChange={setDraftStatus}>
                                            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-sm">
                                                <SelectValue placeholder="All Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="frozen">Frozen</SelectItem>
                                                <SelectItem value="expired">Expired</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500">Plan</label>
                                        <Select value={draftPlan} onValueChange={setDraftPlan}>
                                            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-sm">
                                                <SelectValue placeholder="All Plans" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Plans</SelectItem>
                                                {plans.map((plan) => (
                                                    <SelectItem key={plan.id} value={plan.id}>
                                                        {plan.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Gender</label>
                                    <Select value={draftGender} onValueChange={setDraftGender}>
                                        <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-sm">
                                            <SelectValue placeholder="All Genders" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Genders</SelectItem>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Start Date Range */}
                            <div className="rounded-xl bg-slate-50 p-3 shadow-sm">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Start Date Range</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-500">From</label>
                                            {draftStartFrom && (
                                                <button type="button" onClick={() => setDraftStartFrom('')} className="text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded px-1 py-0.5 transition-colors">✕ Reset</button>
                                            )}
                                        </div>
                                        <Input type="date" value={draftStartFrom} onChange={(e) => setDraftStartFrom(e.target.value)} className="h-10 w-[90%] rounded-xl border-slate-200 bg-white text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-500">To</label>
                                            {draftStartTo && (
                                                <button type="button" onClick={() => setDraftStartTo('')} className="text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded px-1 py-0.5 transition-colors">✕ Reset</button>
                                            )}
                                        </div>
                                        <Input type="date" value={draftStartTo} onChange={(e) => setDraftStartTo(e.target.value)} className="h-10 w-[90%] rounded-xl border-slate-200 bg-white text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Expiry Date Range */}
                            <div className="rounded-xl bg-slate-50 p-3 shadow-sm">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Expiry Date Range</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-500">From</label>
                                            {draftEndFrom && (
                                                <button type="button" onClick={() => setDraftEndFrom('')} className="text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded px-1 py-0.5 transition-colors">✕ Reset</button>
                                            )}
                                        </div>
                                        <Input type="date" value={draftEndFrom} onChange={(e) => setDraftEndFrom(e.target.value)} className="h-10 w-[90%] rounded-xl border-slate-200 bg-white text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-slate-500">To</label>
                                            {draftEndTo && (
                                                <button type="button" onClick={() => setDraftEndTo('')} className="text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded px-1 py-0.5 transition-colors">✕ Reset</button>
                                            )}
                                        </div>
                                        <Input type="date" value={draftEndTo} onChange={(e) => setDraftEndTo(e.target.value)} className="h-10 w-[90%] rounded-xl border-slate-200 bg-white text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Validation error */}
                            {dateError && (
                                <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                                    <span>⚠</span> {dateError}
                                </p>
                            )}
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
                                    onClick={() => setShowAdvancedSearch(false)}
                                    className="h-10 rounded-xl border-slate-200 text-sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleApplyAdvancedSearch}
                                    className="h-10 rounded-xl bg-blue-600 px-5 text-sm text-white hover:bg-blue-700"
                                >
                                    <Search className="mr-1.5 h-3.5 w-3.5" />
                                    Apply Search
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
                {/* Header, Search + Filter */}
                <div className="border-b border-slate-100 p-4 sm:p-5">
                    {/* Header Row */}
                    <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Members</h1>
                        <Button
                            type="button"
                            onClick={handleOpenAddMember}
                            disabled={openingAddMember}
                            className="h-12 w-12 shrink-0 rounded-full bg-blue-600 p-0 text-white shadow-[0_8px_16px_rgba(15,91,225,0.2)] hover:bg-blue-700 sm:h-12 sm:w-auto sm:rounded-2xl sm:px-4"
                        >
                            {openingAddMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
                            <span className="ml-1 hidden sm:inline">{openingAddMember ? 'Opening...' : 'Add Member'}</span>
                        </Button>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                        <div className="relative flex-3 min-w-0">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by name or member ID..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm focus:border-blue-400 focus:ring-blue-400"
                            />
                        </div>

                        <div className="relative flex flex-1 items-center gap-1.5 sm:gap-2 min-w-fit">
                            <button
                                type="button"
                                onClick={handleOpenAdvancedSearch}
                                className="flex h-12 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 sm:px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 min-w-0"
                            >
                                <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500" />
                                <span className="hidden xl:inline whitespace-nowrap">Filter</span>
                                {hasActiveAdvancedFilters && (
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                            {hasActiveAdvancedFilters && (
                                <button
                                    type="button"
                                    onClick={handleClearAllFilters}
                                    className="flex h-12 w-12 sm:w-auto shrink-0 items-center justify-center rounded-2xl bg-red-50 px-0 sm:px-3 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                                    title="Remove filters"
                                >
                                    <X className="h-4 w-4 shrink-0" />
                                    <span className="hidden sm:inline ml-1 font-semibold whitespace-nowrap">Clear</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-slate-100 lg:hidden">
                    {paginated.length === 0 ? (
                        <div className="px-4 py-16 text-center text-sm text-slate-400">No members found</div>
                    ) : (
                        paginated.map((member) => {
                            const initials = member.full_name
                                .split(' ')
                                .map((name) => name[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            const planName = member.membership_plan?.name
                            const planColor = planName ? getPlanColor(planName) : 'text-gray-400'
                            const isNavigating = navigatingMemberId === member.id

                            return (
                                <div
                                    key={member.id}
                                    onClick={() => handleViewMember(member.id)}
                                    className={`relative cursor-pointer px-4 py-3 transition-colors ${
                                        isNavigating ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    {/* Loading overlay for mobile card */}
                                    {isNavigating && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                        </div>
                                    )}
                                    <div className={`flex items-start justify-between gap-3 ${isNavigating ? 'opacity-40' : ''}`}>
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-slate-100">
                                                <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-semibold text-white">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[15px] font-medium leading-tight text-blue-600">
                                                            {member.full_name}
                                                        </p>
                                                        <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-400">
                                                            {member.member_id}
                                                        </p>
                                                    </div>
                                                </div>

                                                <p className="mt-1 truncate text-[14px] leading-tight text-slate-700">
                                                    <span className="capitalize">{member.gender || 'Unknown'}</span> - {member.phone}
                                                </p>
                                                <p className={`mt-1 truncate text-[14px] leading-tight ${planColor}`}>{planName || '-'}</p>
                                                <p className="mt-1 text-[13px] leading-tight text-slate-400">
                                                    {member.membership_expiry_date ? formatDate(member.membership_expiry_date) : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className="flex items-center gap-1 pl-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <StatusBadge status={member.status} />
                                            <button
                                                title="Delete"
                                                disabled={deletingId === member.id || !!navigatingMemberId}
                                                onClick={() => handleDelete(member.id, member.full_name)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="w-16 py-3 pl-5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Photo</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Member ID</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Gender</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Plan</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Expiry Date</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-3 py-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-16 text-center text-sm text-gray-400">
                                        No members found
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((member) => {
                                    const initials = member.full_name
                                        .split(' ')
                                        .map((name) => name[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)
                                    const planName = member.membership_plan?.name
                                    const planColor = planName ? getPlanColor(planName) : 'text-gray-400'
                                    const isNavigating = navigatingMemberId === member.id

                                    return (
                                        <tr
                                            key={member.id}
                                            onClick={() => handleViewMember(member.id)}
                                            className={`group cursor-pointer transition-colors ${
                                                isNavigating
                                                    ? 'bg-blue-50/60 opacity-60'
                                                    : 'hover:bg-blue-50/30'
                                            }`}
                                        >
                                            <td className="py-3 pl-5 pr-3">
                                                <Avatar className="h-9 w-9 ring-2 ring-gray-100">
                                                    <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-semibold text-white">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm font-semibold text-gray-800">{member.member_id}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm font-medium text-gray-800">{member.full_name}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-500">{member.phone}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm capitalize text-gray-500">{member.gender || '-'}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`text-sm font-medium ${planColor}`}>{planName || '-'}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-500">
                                                    {member.membership_expiry_date ? formatDate(member.membership_expiry_date) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <StatusBadge status={member.status} />
                                            </td>
                                            <td className="px-3 py-3 pr-5" onClick={(e) => e.stopPropagation()}>
                                                {isNavigating ? (
                                                    <div className="flex items-center justify-end pr-1">
                                                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            title="View"
                                                            onClick={() => handleViewMember(member.id)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-50"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <Link href={`/admin/members/${member.id}/edit`}>
                                                            <button
                                                                title="Edit"
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                        </Link>
                                                        <button
                                                            title="Delete"
                                                            disabled={deletingId === member.id || !!navigatingMemberId}
                                                            onClick={() => handleDelete(member.id, member.full_name)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500">
                        Showing{' '}
                        <span className="font-semibold text-blue-600">
                            {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}-
                            {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                        </span>{' '}
                        of <span className="font-medium text-gray-700">{filtered.length}</span> members
                    </p>
                    {totalPages > 1 ? (
                        <div className="self-end sm:ml-auto">
                            <PaginationBar currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} />
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

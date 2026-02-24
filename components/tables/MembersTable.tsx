'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
import { Search, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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
    membership_expiry_date?: string | null
    membership_plan_id?: string | null
    membership_plan?: { id: string; name: string } | null
}

interface MembersTableProps {
    members: Member[]
    plans: { id: string; name: string }[]
}

// Give each plan name a consistent colour
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
        for (
            let i = Math.max(2, currentPage - 1);
            i <= Math.min(totalPages - 1, currentPage + 1);
            i++
        ) {
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
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {pages.map((p, idx) =>
                p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400">
                        …
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
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
                Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

export default function MembersTable({ members, plans }: MembersTableProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [planFilter, setPlanFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Filter
    const filtered = useMemo(() => {
        return members.filter((m) => {
            const q = searchQuery.toLowerCase()
            const matchesSearch =
                m.full_name.toLowerCase().includes(q) ||
                m.member_id.toLowerCase().includes(q) ||
                m.phone.includes(q) ||
                (m.email?.toLowerCase().includes(q) ?? false)
            const matchesStatus = statusFilter === 'all' || m.status === statusFilter
            const matchesPlan = planFilter === 'all' || m.membership_plan_id === planFilter
            return matchesSearch && matchesStatus && matchesPlan
        })
    }, [members, searchQuery, statusFilter, planFilter])

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const safePage = Math.min(currentPage, totalPages)
    const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

    const handlePageChange = (p: number) => {
        if (p >= 1 && p <= totalPages) setCurrentPage(p)
    }

    // Reset page on filter change
    const handleSearch = (v: string) => { setSearchQuery(v); setCurrentPage(1) }
    const handleStatus = (v: string) => { setStatusFilter(v); setCurrentPage(1) }
    const handlePlan = (v: string) => { setPlanFilter(v); setCurrentPage(1) }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete member "${name}"? This cannot be undone.`)) return
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

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Members</h1>
                </div>
                <Link href="/admin/members/add">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5 px-4">
                        <Plus className="h-4 w-4" />
                        Add Member
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by name or member ID..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9 bg-white border-gray-200 text-sm h-10 focus:border-blue-400 focus:ring-blue-400"
                    />
                </div>
                <Select value={statusFilter} onValueChange={handleStatus}>
                    <SelectTrigger className="w-full sm:w-36 h-10 bg-white border-gray-200 text-sm">
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
                <Select value={planFilter} onValueChange={handlePlan}>
                    <SelectTrigger className="w-full sm:w-36 h-10 bg-white border-gray-200 text-sm">
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

            {/* Table */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="py-3 pl-5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-16">Photo</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Member ID</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Plan</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Expiry Date</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-3 py-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                                        No members found
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((member) => {
                                    const initials = member.full_name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)
                                    const planName = member.membership_plan?.name
                                    const planColor = planName ? getPlanColor(planName) : 'text-gray-400'

                                    return (
                                        <tr
                                            key={member.id}
                                            className="hover:bg-blue-50/30 transition-colors group"
                                        >
                                            {/* Photo */}
                                            <td className="py-3 pl-5 pr-3">
                                                <Avatar className="h-9 w-9 ring-2 ring-gray-100">
                                                    <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-semibold">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </td>
                                            {/* Member ID */}
                                            <td className="px-3 py-3">
                                                <span className="text-sm font-semibold text-gray-800">{member.member_id}</span>
                                            </td>
                                            {/* Name */}
                                            <td className="px-3 py-3">
                                                <Link
                                                    href={`/admin/members/${member.id}`}
                                                    className="text-sm font-medium text-gray-800 hover:text-gray-600 transition-colors"
                                                >
                                                    {member.full_name}
                                                </Link>
                                            </td>
                                            {/* Phone */}
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-500">{member.phone}</span>
                                            </td>
                                            {/* Plan */}
                                            <td className="px-3 py-3">
                                                <span className={`text-sm font-medium ${planColor}`}>
                                                    {planName || '—'}
                                                </span>
                                            </td>
                                            {/* Expiry */}
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-500">
                                                    {member.membership_expiry_date
                                                        ? formatDate(member.membership_expiry_date)
                                                        : '—'}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-3 py-3">
                                                <StatusBadge status={member.status} />
                                            </td>
                                            {/* Actions */}
                                            <td className="px-3 py-3 pr-5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={`/admin/members/${member.id}`}>
                                                        <button
                                                            title="View"
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    </Link>
                                                    <Link href={`/admin/members/${member.id}/edit`}>
                                                        <button
                                                            title="Edit"
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    </Link>
                                                    <button
                                                        title="Delete"
                                                        disabled={deletingId === member.id}
                                                        onClick={() => handleDelete(member.id, member.full_name)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer — inside the card */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 px-5 py-3">
                    <p className="text-xs text-gray-500">
                        Showing{' '}
                        <span className="font-semibold text-blue-600">
                            {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}-
                            {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-gray-700">{filtered.length}</span> members
                    </p>
                    {totalPages > 1 && (
                        <PaginationBar
                            currentPage={safePage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

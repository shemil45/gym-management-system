'use client'

import { useEffect, useState, useMemo, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    Plus,
    Trash2,
    X,
    Loader2,
    Zap,
    Users,
    Wrench,
    Home,
    Package,
    MoreHorizontal,
    Search,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { addExpense, deleteExpense } from '@/app/admin/finances/expenses/actions'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type ExpenseCategory =
    | 'utilities'
    | 'salary'
    | 'equipment'
    | 'maintenance'
    | 'marketing'
    | 'rent'
    | 'other'

interface ExpenseRow {
    id: string
    category: ExpenseCategory
    amount: number
    description: string
    expense_date: string
    created_at: string
}

interface PaymentRow {
    amount: number
    payment_date: string
}

interface ExpenseDashboardProps {
    payments: PaymentRow[]
    expenses: ExpenseRow[]
    initialFilters?: {
        category?: string
        date?: string
        type?: string
    }
}

type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'MAX'

type VisibleExpenseCategory = Exclude<ExpenseCategory, 'marketing'>

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
    VisibleExpenseCategory,
    { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
    utilities: {
        label: 'Utilities',
        icon: <Zap className="h-3.5 w-3.5" />,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50 border-yellow-100',
    },
    salary: {
        label: 'Salary',
        icon: <Users className="h-3.5 w-3.5" />,
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-100',
    },
    equipment: {
        label: 'Equipment',
        icon: <Package className="h-3.5 w-3.5" />,
        color: 'text-violet-600',
        bg: 'bg-violet-50 border-violet-100',
    },
    maintenance: {
        label: 'Maintenance',
        icon: <Wrench className="h-3.5 w-3.5" />,
        color: 'text-orange-600',
        bg: 'bg-orange-50 border-orange-100',
    },
    rent: {
        label: 'Rent',
        icon: <Home className="h-3.5 w-3.5" />,
        color: 'text-teal-600',
        bg: 'bg-teal-50 border-teal-100',
    },
    other: {
        label: 'Other',
        icon: <MoreHorizontal className="h-3.5 w-3.5" />,
        color: 'text-gray-600',
        bg: 'bg-gray-50 border-gray-100',
    },
}

const CHART_RANGE_OPTIONS: ChartRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'MAX']
const ITEMS_PER_PAGE = 20

function getCategoryConfig(category: ExpenseCategory) {
    return CATEGORY_CONFIG[category as VisibleExpenseCategory] ?? CATEGORY_CONFIG.other
}

function formatDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, days: number) {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
}

function addMonths(date: Date, months: number) {
    const next = new Date(date)
    next.setMonth(next.getMonth() + months)
    return next
}

function getRangeStartDate(range: ChartRange, anchor: Date) {
    const baseDate = new Date(anchor)
    baseDate.setHours(0, 0, 0, 0)

    switch (range) {
        case '1D':
            return addDays(baseDate, -1)
        case '1W':
            return addDays(baseDate, -7)
        case '1M':
            return addMonths(baseDate, -1)
        case '3M':
            return addMonths(baseDate, -3)
        case '6M':
            return addMonths(baseDate, -6)
        case '1Y':
            return addMonths(baseDate, -12)
        case 'MAX':
        default:
            return null
    }
}

function getPresetDateRange(preset: string | null) {
    const today = new Date()
    const todayValue = today.toISOString().split('T')[0]

    if (preset === 'today') {
        return { from: todayValue, to: todayValue }
    }

    if (preset === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        return { from: monthStart, to: todayValue }
    }

    return { from: '', to: '' }
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean
    payload?: { name: string; value: number; fill: string }[]
    label?: string
}) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl">
                <p className="font-semibold mb-1">{label}</p>
                {payload.map((p) => (
                    <p key={p.name} style={{ color: p.fill === '#1d4ed8' ? '#93c5fd' : '#86efac' }}>
                        {p.name}: {formatCurrency(p.value)}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon,
    iconBg,
    sub,
    highlight,
}: {
    label: string
    value: string
    icon: React.ReactNode
    iconBg: string
    sub?: string
    highlight?: 'green' | 'red'
}) {
    return (
        <div className="flex items-start gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-[0_14px_32px_rgba(15,23,42,0.07)] sm:px-4">
            <div className={`mt-0.5 flex h-10 w-9 shrink-0 items-center justify-center rounded-sm sm:h-9 sm:w-9 ${iconBg}`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="line-clamp-2 min-h-6 text-[10.5px] font-medium leading-4 text-gray-500">{label}</p>
                <p
                    className={`-mt-1.25 text-left text-[1.05rem] font-bold leading-tight sm:text-[1.15rem] ${highlight === 'green'
                        ? 'text-emerald-600'
                        : highlight === 'red'
                            ? 'text-red-500'
                            : 'text-gray-900'
                        }`}
                >
                    {value}
                </p>
                {sub && <p className="mt-0.5 text-[10px] leading-4 text-gray-400">{sub}</p>}
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
                    <span key={`expense-ellipsis-${idx}`} className="px-2 text-xs text-gray-400">
                        ...
                    </span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                            currentPage === p
                                ? 'bg-rose-600 text-white shadow-sm'
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

// ─── Add Expense Modal ────────────────────────────────────────────────────────

function AddExpenseModal({ onClose }: { onClose: () => void }) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [category, setCategory] = useState<ExpenseCategory | ''>('')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!category) { toast.error('Please select a category'); return }
        if (!amount || isNaN(parseFloat(amount))) { toast.error('Enter a valid amount'); return }
        if (!description.trim()) { toast.error('Please enter a description'); return }

        const fd = new FormData()
        fd.append('category', category)
        fd.append('amount', amount)
        fd.append('description', description)
        fd.append('expense_date', expenseDate)

        startTransition(async () => {
            const result = await addExpense(fd)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Expense added')
                router.refresh()
                onClose()
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                            <TrendingDown className="h-4 w-4 text-rose-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">Add Expense</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[calc(90vh-72px)] space-y-4 overflow-y-auto p-5 sm:p-6">
                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-700">
                            Category <span className="text-red-500">*</span>
                        </Label>
                        <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                            <SelectTrigger className="h-10 border-gray-300 text-sm">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                                    <SelectItem key={key} value={key}>
                                        {cfg.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-700">
                            Amount <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="h-10 pl-7 border-gray-300 text-sm"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-700">
                            Description <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            placeholder="Brief description of the expense"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-10 border-gray-300 text-sm"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-700">Date</Label>
                        <Input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="h-10 border-gray-300 text-sm text-gray-600"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={pending}
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-50"
                        >
                            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            {pending ? 'Saving…' : 'Add Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Category Badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: ExpenseCategory }) {
    const cfg = getCategoryConfig(category)
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.color} ${cfg.bg}`}>
            {cfg.icon} {cfg.label}
        </span>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExpenseDashboard({ payments, expenses, initialFilters }: ExpenseDashboardProps) {
    const router = useRouter()
    const { confirm, dialog } = useConfirmDialog()
    const expenseTableRef = useRef<HTMLDivElement | null>(null)
    const initialDateRange = getPresetDateRange(initialFilters?.date ?? null)
    const [showModal, setShowModal] = useState(false)
    const [showFilterModal, setShowFilterModal] = useState(false)
    const [breakdownRange, setBreakdownRange] = useState<ChartRange>('MAX')
    const [categoryFilter, setCategoryFilter] = useState(initialFilters?.category || 'all')
    const [dateFrom, setDateFrom] = useState(initialDateRange.from)
    const [dateTo, setDateTo] = useState(initialDateRange.to)
    const [draftCategory, setDraftCategory] = useState('all')
    const [draftDateFrom, setDraftDateFrom] = useState('')
    const [draftDateTo, setDraftDateTo] = useState('')
    const [dateError, setDateError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [chartWindowIndex, setChartWindowIndex] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        if (showFilterModal || showModal) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [showFilterModal, showModal])

    useEffect(() => {
        if (initialFilters?.type !== 'expense') return

        const timeoutId = window.setTimeout(() => {
            expenseTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)

        return () => window.clearTimeout(timeoutId)
    }, [initialFilters?.type])

    // ── Build last-12-months chart data ──────────────────────────────────────
    const chartData = useMemo(() => {
        const revenueByMonth: Record<string, number> = {}
        payments.forEach((p) => {
            const key = p.payment_date.slice(0, 7)
            revenueByMonth[key] = (revenueByMonth[key] || 0) + Number(p.amount)
        })

        const expensesByMonth: Record<string, number> = {}
        expenses.forEach((e) => {
            const key = e.expense_date.slice(0, 7)
            expensesByMonth[key] = (expensesByMonth[key] || 0) + Number(e.amount)
        })

        const allKeys = [...new Set([...Object.keys(revenueByMonth), ...Object.keys(expensesByMonth)])].sort()
        const currentMonth = new Date()
        currentMonth.setDate(1)
        const fallbackKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
        const lastKey = allKeys.at(-1) ?? fallbackKey
        const [lastYear, lastMonth] = lastKey.split('-').map(Number)
        const anchor = new Date(lastYear, lastMonth - 1, 1)
        const months: { label: string; key: string; rangeLabel: string }[] = []

        for (let i = 17; i >= 0; i--) {
            const d = new Date(anchor)
            d.setMonth(anchor.getMonth() - i)
            months.push({
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                rangeLabel: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            })
        }

        return months.map((m) => ({
            month: m.label,
            rangeLabel: m.rangeLabel,
            Revenue: Math.round(revenueByMonth[m.key] || 0),
            Expenses: Math.round(expensesByMonth[m.key] || 0),
        }))
    }, [payments, expenses])

    const chartWindowCount = Math.max(1, Math.ceil(chartData.length / 6))
    const safeChartWindowIndex = Math.min(chartWindowIndex, chartWindowCount - 1)
    const visibleChartData = chartData.slice(safeChartWindowIndex * 6, safeChartWindowIndex * 6 + 6)
    const chartRangeLabel =
        visibleChartData.length > 0
            ? `${visibleChartData[0].rangeLabel} - ${visibleChartData[visibleChartData.length - 1].rangeLabel}`
            : 'No data available'
    const hasActiveFilters = categoryFilter !== 'all' || !!dateFrom || !!dateTo
    const activeFilterCount = (categoryFilter !== 'all' ? 1 : 0) + ((dateFrom || dateTo) ? 1 : 0)

    useEffect(() => {
        setChartWindowIndex(chartWindowCount - 1)
    }, [chartWindowCount])

    // ── Summary stats ────────────────────────────────────────────────────────
    const now = useMemo(() => new Date(), [])
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthRevenue = payments
        .filter((p) => p.payment_date.startsWith(monthKey))
        .reduce((s, p) => s + Number(p.amount), 0)
    const monthExpenses = expenses
        .filter((e) => e.expense_date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.amount), 0)
    const monthNet = monthRevenue - monthExpenses

    const breakdownExpenses = useMemo(() => {
        const rangeStart = getRangeStartDate(breakdownRange, now)
        return expenses.filter((expense) => {
            if (expense.category === 'marketing') {
                return false
            }

            if (!rangeStart) {
                return true
            }

            return new Date(expense.expense_date) >= rangeStart
        })
    }, [expenses, breakdownRange, now])

    // ── Filtered expenses table ──────────────────────────────────────────────
    const filteredExpenses = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return expenses.filter((e) => {
            const matchCat = categoryFilter === 'all' || e.category === categoryFilter
            const matchSearch = !q || e.description.toLowerCase().includes(q)
            const matchDateFrom = !dateFrom || e.expense_date >= dateFrom
            const matchDateTo = !dateTo || e.expense_date <= dateTo
            return matchCat && matchSearch && matchDateFrom && matchDateTo
        })
    }, [expenses, searchQuery, categoryFilter, dateFrom, dateTo])

    const totalExpensePages = Math.max(1, Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE))
    const safeExpensePage = Math.min(currentPage, totalExpensePages)
    const paginatedExpenses = filteredExpenses.slice(
        (safeExpensePage - 1) * ITEMS_PER_PAGE,
        safeExpensePage * ITEMS_PER_PAGE
    )

    const handleOpenFilterModal = () => {
        setDraftCategory(categoryFilter)
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

        setCategoryFilter(draftCategory)
        setDateFrom(draftDateFrom)
        setDateTo(draftDateTo)
        setCurrentPage(1)
        setDateError('')
        setShowFilterModal(false)
    }

    const handleResetDraft = () => {
        setDraftCategory('all')
        setDraftDateFrom('')
        setDraftDateTo('')
        setDateError('')
    }

    const handleClearAllFilters = () => {
        setCategoryFilter('all')
        setDateFrom('')
        setDateTo('')
        setCurrentPage(1)
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete expense?',
            description: 'Delete this expense? This cannot be undone.',
            confirmLabel: 'Delete',
            tone: 'danger',
        })
        if (!confirmed) return
        setDeletingId(id)
        const result = await deleteExpense(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Expense deleted')
            router.refresh()
        }
        setDeletingId(null)
    }

    // ── Expense breakdown by category ────────────────────────────────────────
    const categoryTotals = useMemo(() => {
        const totals: Record<string, number> = {}
        breakdownExpenses.forEach((e) => {
            totals[e.category] = (totals[e.category] || 0) + Number(e.amount)
        })
        return Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([cat, amt]) => ({ cat: cat as VisibleExpenseCategory, amt }))
    }, [breakdownExpenses])

    const breakdownTotal = useMemo(
        () => categoryTotals.reduce((sum, category) => sum + category.amt, 0),
        [categoryTotals]
    )

    const breakdownLabel = useMemo(() => {
        if (breakdownRange === 'MAX') {
            return 'Where your money is going.'
        }

        const rangeStart = getRangeStartDate(breakdownRange, now)
        if (!rangeStart) {
            return 'Where your money is going.'
        }

        return `${formatDateKey(rangeStart)} to ${formatDateKey(now)}`
    }, [breakdownRange, now])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, categoryFilter, dateFrom, dateTo])

    return (
        <>
            {dialog}
            <div className="space-y-6">
                {showFilterModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
                        onClick={() => setShowFilterModal(false)}
                    >
                        <div
                            className="relative max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)] [&::-webkit-scrollbar]:hidden"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50">
                                        <SlidersHorizontal className="h-4 w-4 text-rose-600" />
                                    </div>
                                    <h2 className="text-base font-semibold text-slate-800">Filter Expenses</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowFilterModal(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Expense Category</label>
                                    <Select value={draftCategory} onValueChange={setDraftCategory}>
                                        <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-sm">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                                                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-3 shadow-sm">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Expense Date Range</p>
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
                                        className="h-10 rounded-xl bg-rose-600 px-5 text-sm text-white hover:bg-rose-700"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* ── Header ── */}
                <div className="rounded-[1.75rem] bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Expenses</h1>
                            <p className="mt-1 text-sm text-slate-400">Revenue, expenses and profitability in one place.</p>
                        </div>
                        <Button
                            onClick={() => setShowModal(true)}
                            className="h-14 w-14 shrink-0 rounded-full bg-rose-600 p-0 text-white shadow-[0_16px_32px_rgba(225,29,72,0.22)] hover:bg-rose-700 sm:h-14 sm:w-auto sm:rounded-2xl sm:px-4 sm:gap-1.5"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="ml-1 hidden sm:inline">Add Expense</span>
                        </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                label="Month Revenue"
                                value={formatCurrency(monthRevenue)}
                                icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                                iconBg="bg-emerald-50"
                            />
                            <StatCard
                                label="Month Expenses"
                                value={formatCurrency(monthExpenses)}
                                icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
                                iconBg="bg-rose-50"
                            />
                        </div>
                        <StatCard
                            label="Net Profit"
                            value={formatCurrency(monthNet)}
                            icon={<Wallet className="h-5 w-5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            highlight={monthNet >= 0 ? 'green' : 'red'}
                        />
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="hidden grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Month Revenue"
                        value={formatCurrency(monthRevenue)}
                        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                        iconBg="bg-emerald-50"
                    />
                    <StatCard
                        label="Month Expenses"
                        value={formatCurrency(monthExpenses)}
                        icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
                        iconBg="bg-rose-50"
                    />
                    <StatCard
                        label="Net Profit"
                        value={formatCurrency(monthNet)}
                        icon={<Wallet className="h-5 w-5 text-blue-600" />}
                        iconBg="bg-blue-50"
                        highlight={monthNet >= 0 ? 'green' : 'red'}
                    />
                    <StatCard
                        label="Month Net"
                        value={formatCurrency(monthNet)}
                        icon={<ArrowUpRight className="h-5 w-5 text-violet-600" />}
                        iconBg="bg-violet-50"
                        highlight={monthNet >= 0 ? 'green' : 'red'}
                    />
                </div>

                {/* ── Chart + Breakdown ── */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    {/* Bar chart */}
                    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)] sm:p-5 xl:col-span-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-gray-900 sm:text-base">Revenue vs Expenses</h2>
                                <p className="mt-1 text-xs text-gray-400 sm:text-sm">{chartRangeLabel}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setChartWindowIndex((value) => Math.max(0, value - 1))}
                                    disabled={safeChartWindowIndex === 0}
                                    className="h-9 w-9 rounded-xl border-gray-200"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setChartWindowIndex((value) => Math.min(chartWindowCount - 1, value + 1))}
                                    disabled={safeChartWindowIndex >= chartWindowCount - 1}
                                    className="h-9 w-9 rounded-xl border-gray-200"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4">
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={visibleChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="18%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={0} />
                                    <YAxis
                                        tick={{ fontSize: 9, fill: '#9ca3af' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                                        width={34}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    <Bar dataKey="Revenue" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category breakdown */}
                    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)] sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Expense Breakdown</h2>
                                <p className="mt-1 text-xs text-gray-400">{breakdownLabel}</p>
                            </div>
                            <Select value={breakdownRange} onValueChange={(value) => setBreakdownRange(value as ChartRange)}>
                                <SelectTrigger className="h-9 w-[88px] rounded-xl border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CHART_RANGE_OPTIONS.map((range) => (
                                        <SelectItem key={range} value={range}>
                                            {range}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {categoryTotals.length === 0 ? (
                            <p className="py-8 text-center text-xs text-gray-400">No expenses yet</p>
                        ) : (
                            <div className="mt-5">
                                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                                {categoryTotals.map(({ cat, amt }) => {
                                    const pct = breakdownTotal > 0 ? Math.round((amt / breakdownTotal) * 100) : 0
                                    const cfg = getCategoryConfig(cat)
                                    return (
                                        <div key={cat} className="space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50/55 p-2.5">
                                            <div className="space-y-1.5">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}>
                                                        {cfg.icon}
                                                    </div>
                                                    <p className="truncate text-[13px] font-semibold text-slate-900">{cfg.label}</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="truncate text-[11px] text-slate-400">{pct}%</p>
                                                    <p className="shrink-0 text-[13px] font-bold text-slate-900">{formatCurrency(amt)}</p>
                                                </div>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-[width] duration-300"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Total Expense</p>
                                        <p className="mt-1 text-[11px] text-slate-400">For the selected range</p>
                                    </div>
                                    <p className="text-base font-bold text-slate-900">{formatCurrency(breakdownTotal)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Expenses Table ── */}
                <div
                    ref={expenseTableRef}
                    className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]"
                >
                    <div className="border-b border-slate-100 p-4 sm:p-5">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900">All Expenses</h2>
                            <p className="mt-1 text-xs text-gray-400">Track every outgoing payment with category and date.</p>
                        </div>

                        <div className="flex gap-2 sm:gap-3">
                            <div className="relative min-w-0 flex-[3]">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Search description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm focus:border-rose-400 focus:ring-rose-400"
                                />
                            </div>

                            <div className="relative flex min-w-fit flex-1 items-center gap-1.5 sm:gap-2">
                                <button
                                    type="button"
                                    onClick={handleOpenFilterModal}
                                    className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:gap-2 sm:px-3"
                                >
                                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500" />
                                    <span className="hidden xl:inline whitespace-nowrap">Filter</span>
                                    {hasActiveFilters && (
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleClearAllFilters}
                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 px-0 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 hover:text-red-700 sm:w-auto sm:px-3"
                                        title="Clear filters"
                                    >
                                        <X className="h-4 w-4 shrink-0" />
                                        <span className="ml-1 hidden whitespace-nowrap font-semibold sm:inline">Clear</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 md:hidden">
                        {paginatedExpenses.length === 0 ? (
                            <div className="px-4 py-14 text-center text-sm text-gray-400">
                                No expenses found
                            </div>
                        ) : (
                            paginatedExpenses.map((expense) => (
                                <div key={expense.id} className="px-4 py-3 transition-colors hover:bg-slate-50">
                                    <div className="min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-[15px] font-medium leading-tight text-slate-800">
                                                    {expense.description}
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-400">
                                                    {getCategoryConfig(expense.category).label}
                                                </p>
                                            </div>
                                            <p className="shrink-0 text-[15px] font-bold leading-tight text-rose-600">
                                                {formatCurrency(Number(expense.amount))}
                                            </p>
                                        </div>

                                        <div className="mt-1.5 flex items-center justify-between gap-2">
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                            <span className="text-[12px] text-slate-400">
                                                {formatDate(expense.expense_date)}
                                            </span>
                                            <span className="text-slate-200">·</span>
                                            <CategoryBadge category={expense.category} />
                                            </div>
                                            <button
                                                title="Delete expense"
                                                disabled={deletingId === expense.id}
                                                onClick={() => handleDelete(expense.id)}
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/60">
                                    <th className="py-3 pl-5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Category</th>
                                    <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                                    <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                                    <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                                    <th className="px-3 py-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-14 text-center text-sm text-gray-400">
                                            No expenses found
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedExpenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-rose-50/20 transition-colors">
                                            <td className="py-3 pl-5 pr-3">
                                                <CategoryBadge category={expense.category} />
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-700">{expense.description}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm text-gray-500">{formatDate(expense.expense_date)}</span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <span className="text-sm font-semibold text-rose-600">
                                                    {formatCurrency(Number(expense.amount))}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 pr-5 text-right">
                                                <button
                                                    title="Delete expense"
                                                    disabled={deletingId === expense.id}
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors ml-auto"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <p>
                            Showing{' '}
                            <span className="font-semibold text-rose-600">
                                {filteredExpenses.length === 0 ? 0 : (safeExpensePage - 1) * ITEMS_PER_PAGE + 1}-
                                {Math.min(safeExpensePage * ITEMS_PER_PAGE, filteredExpenses.length)}
                            </span>{' '}
                            of <span className="font-medium text-slate-700">{filteredExpenses.length}</span> expenses
                        </p>
                        {totalExpensePages > 1 ? (
                            <div className="self-end sm:ml-auto">
                                <PaginationBar
                                    currentPage={safeExpensePage}
                                    totalPages={totalExpensePages}
                                    onPageChange={(page) => {
                                        if (page >= 1 && page <= totalExpensePages) setCurrentPage(page)
                                    }}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Add Expense Modal */}
                {showModal && <AddExpenseModal onClose={() => setShowModal(false)} />}
            </div>
        </>
    )
}

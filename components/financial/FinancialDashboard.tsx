'use client'

import { useState, useMemo, useTransition } from 'react'
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
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    X,
    Loader2,
    Zap,
    Users,
    Wrench,
    Megaphone,
    Home,
    Package,
    MoreHorizontal,
    Search,
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
import { addExpense, deleteExpense } from '@/app/admin/financial/actions'
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

interface FinancialDashboardProps {
    payments: PaymentRow[]
    expenses: ExpenseRow[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
    ExpenseCategory,
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
    marketing: {
        label: 'Marketing',
        icon: <Megaphone className="h-3.5 w-3.5" />,
        color: 'text-pink-600',
        bg: 'bg-pink-50 border-pink-100',
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
        <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)] sm:px-5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-500">{label}</p>
                <p
                    className={`text-xl font-bold truncate ${highlight === 'green'
                        ? 'text-emerald-600'
                        : highlight === 'red'
                            ? 'text-red-500'
                            : 'text-gray-900'
                        }`}
                >
                    {value}
                </p>
                {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
            </div>
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
    const cfg = CATEGORY_CONFIG[category]
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.color} ${cfg.bg}`}>
            {cfg.icon} {cfg.label}
        </span>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancialDashboard({ payments, expenses }: FinancialDashboardProps) {
    const router = useRouter()
    const { confirm, dialog } = useConfirmDialog()
    const [showModal, setShowModal] = useState(false)
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [chartWindowIndex, setChartWindowIndex] = useState(0)

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

    // ── Summary stats ────────────────────────────────────────────────────────
    const totalRevenue = useMemo(
        () => payments.reduce((s, p) => s + Number(p.amount), 0),
        [payments]
    )
    const totalExpenses = useMemo(
        () => expenses.reduce((s, e) => s + Number(e.amount), 0),
        [expenses]
    )
    const netProfit = totalRevenue - totalExpenses

    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthRevenue = payments
        .filter((p) => p.payment_date.startsWith(monthKey))
        .reduce((s, p) => s + Number(p.amount), 0)
    const monthExpenses = expenses
        .filter((e) => e.expense_date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.amount), 0)
    const monthNet = monthRevenue - monthExpenses

    // ── Filtered expenses table ──────────────────────────────────────────────
    const filteredExpenses = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return expenses.filter((e) => {
            const matchCat = categoryFilter === 'all' || e.category === categoryFilter
            const matchSearch = !q || e.description.toLowerCase().includes(q)
            return matchCat && matchSearch
        })
    }, [expenses, searchQuery, categoryFilter])

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
        expenses.forEach((e) => {
            totals[e.category] = (totals[e.category] || 0) + Number(e.amount)
        })
        return Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amt]) => ({ cat: cat as ExpenseCategory, amt }))
    }, [expenses])

    return (
        <>
            {dialog}
            <div className="space-y-6">
            {/* ── Header ── */}
            <div className="rounded-[1.75rem] bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Financial</h1>
                        <p className="mt-1 text-sm text-slate-400">Revenue, expenses and profitability in one place.</p>
                    </div>
                    <Button
                        onClick={() => setShowModal(true)}
                        className="h-12 w-full gap-2 rounded-2xl bg-rose-600 px-4 text-white shadow-[0_16px_32px_rgba(225,29,72,0.22)] hover:bg-rose-700 sm:w-auto"
                    >
                        <Plus className="h-4 w-4" /> Add Expense
                    </Button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                    iconBg="bg-emerald-50"
                />
                <StatCard
                    label="Total Expenses"
                    value={formatCurrency(totalExpenses)}
                    icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
                    iconBg="bg-rose-50"
                />
                <StatCard
                    label="Net Profit"
                    value={formatCurrency(netProfit)}
                    icon={<Wallet className="h-5 w-5 text-blue-600" />}
                    iconBg="bg-blue-50"
                    highlight={netProfit >= 0 ? 'green' : 'red'}
                />
                <StatCard
                    label="This Month Net"
                    value={formatCurrency(monthNet)}
                    icon={<ArrowUpRight className="h-5 w-5 text-violet-600" />}
                    iconBg="bg-violet-50"
                    sub={`Rev: ${formatCurrency(monthRevenue)} | Exp: ${formatCurrency(monthExpenses)}`}
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
                    <h2 className="text-sm font-semibold text-gray-900">Expense Breakdown</h2>
                    <p className="mt-1 text-xs text-gray-400">Category share of all recorded expenses.</p>
                    {categoryTotals.length === 0 ? (
                        <p className="py-8 text-center text-xs text-gray-400">No expenses yet</p>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {categoryTotals.map(({ cat, amt }) => {
                                const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0
                                const cfg = CATEGORY_CONFIG[cat]
                                return (
                                    <div key={cat}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                            <span className="text-xs text-gray-600 font-semibold">{formatCurrency(amt)}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-rose-400 transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 text-right">{pct}%</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Expenses Table ── */}
            <div className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
                <div className="border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex flex-col gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">All Expenses</h2>
                            <p className="mt-1 text-xs text-gray-400">Track every outgoing payment with category and date.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 bg-white border-gray-200 text-sm w-full sm:w-52"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-9 w-full sm:w-40 bg-white border-gray-200 text-sm">
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
                    </div>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {filteredExpenses.length === 0 ? (
                        <div className="px-4 py-14 text-center text-sm text-gray-400">
                            No expenses found
                        </div>
                    ) : (
                        filteredExpenses.map((expense) => (
                            <div key={expense.id} className="space-y-3 px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <CategoryBadge category={expense.category} />
                                    <button
                                        title="Delete expense"
                                        disabled={deletingId === expense.id}
                                        onClick={() => handleDelete(expense.id)}
                                        className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{expense.description}</p>
                                    <p className="mt-1 text-xs text-gray-400">{formatDate(expense.expense_date)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Amount</p>
                                    <p className="text-lg font-bold text-rose-600">{formatCurrency(Number(expense.amount))}</p>
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
                                {filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-14 text-center text-sm text-gray-400">
                                            No expenses found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((expense) => (
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
                            {filteredExpenses.length > 0 && (
                                <tfoot>
                                    <tr className="border-t border-gray-100 bg-gray-50/40">
                                        <td colSpan={3} className="py-3 pl-5 text-xs font-semibold text-gray-500">
                                            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                                        </td>
                                        <td className="px-3 py-3 text-right text-sm font-bold text-rose-600">
                                            {formatCurrency(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                </div>

                {filteredExpenses.length > 0 && (
                    <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 md:hidden">
                        {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} · Total {formatCurrency(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {showModal && <AddExpenseModal onClose={() => setShowModal(false)} />}
            </div>
        </>
    )
}

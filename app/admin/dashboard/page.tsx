'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    AlertCircle,
    ArrowRight,
    CreditCard,
    DollarSign,
    Loader2,
    Plus,
    TrendingDown,
    Users,
} from 'lucide-react'
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

interface DashboardData {
    totalMembers: number
    activeMembers: number
    pendingCollection: number
    todayRevenue: number
    monthRevenue: number
    monthExpenses: number
    todayPaymentsCount: number
    todayCheckIns: number
    expiringCount: number
    revenueChart: { date: string; revenue: number }[]
    renewals: {
        id: string
        full_name: string
        member_id: string
        photo_url: string | null
        status: string
        membership_expiry_date: string | null
        membership_plan?: { name: string } | null
    }[]
}

type RangeLabel = '1D' | '5D' | '1M' | '1Y' | '5Y' | 'Max'

const RANGES: { label: RangeLabel; days: number }[] = [
    { label: '1D', days: 1 },
    { label: '5D', days: 5 },
    { label: '1M', days: 30 },
    { label: '1Y', days: 365 },
    { label: '5Y', days: 365 * 5 },
    { label: 'Max', days: Infinity },
]

function toSafeAmount(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
    return Number.isFinite(parsed) ? parsed : 0
}

function sumAmounts(rows: Array<{ amount: unknown }> | null | undefined) {
    return (rows || []).reduce((sum, row) => sum + toSafeAmount(row.amount), 0)
}

function formatExpiryDate(value: string | null) {
    if (!value) return '-'
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value

    const day = String(date.getDate()).padStart(2, '0')
    const month = date.toLocaleDateString('en-IN', { month: 'short' })
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
}

function OverviewCard({
    title,
    value,
    icon,
    accent,
}: {
    title: string
    value: string
    icon: React.ReactNode
    accent: 'blue' | 'green' | 'red'
}) {
    const accents = {
        blue: {
            iconBg: 'bg-blue-100 text-blue-600',
            value: 'text-blue-600',
        },
        green: {
            iconBg: 'bg-emerald-100 text-emerald-600',
            value: 'text-emerald-500',
        },
        red: {
            iconBg: 'bg-red-100 text-red-500',
            value: 'text-red-500',
        },
    }

    return (
        <div className="rounded-2xl bg-white px-4 py-5 text-center shadow-[0_10px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 sm:px-5">
            <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:justify-center sm:gap-2">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accents[accent].iconBg}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1 sm:flex-none">
                    <p className={`truncate text-[1.28rem] font-semibold leading-none tracking-tight ${accents[accent].value} sm:text-[1.45rem]`}>
                        {value}
                    </p>
                    <p className="mt-2 text-[0.72rem] font-medium leading-snug text-slate-500 sm:text-[0.8rem]">{title}</p>
                </div>
            </div>
        </div>
    )
}

function SectionShell({
    title,
    subtitle,
    children,
    action,
    mobileStackAction = false,
}: {
    title: string
    subtitle?: string
    children: React.ReactNode
    action?: React.ReactNode
    mobileStackAction?: boolean
}) {
    return (
        <section className="rounded-2xl bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 sm:p-5">
            <div className={`mb-4 flex gap-3 ${mobileStackAction ? 'flex-col sm:flex-row sm:items-start sm:justify-between' : 'items-start justify-between'}`}>
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
                    {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
                </div>
                {action}
            </div>
            {children}
        </section>
    )
}

const CustomTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
}) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-2xl bg-slate-950 px-3 py-2 text-xs text-white shadow-lg">
                <p className="font-medium">{label}</p>
                <p className="text-blue-300">{formatCurrency(payload[0].value)}</p>
            </div>
        )
    }

    return null
}

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [chartRange, setChartRange] = useState<RangeLabel>('1M')
    const [renewalTab, setRenewalTab] = useState<'expires' | 'overdues'>('expires')
    const [quickActionsOpen, setQuickActionsOpen] = useState(false)

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient()

            const today = new Date().toISOString().split('T')[0]
            const days = Array.from({ length: 365 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (364 - i))
                return d.toISOString().split('T')[0]
            })

            const [
                { count: totalMembers },
                { count: activeMembers },
                { count: todayCheckIns },
                { data: todayPayments },
                { data: pendingPayments },
                { data: monthPayments },
                { data: monthExpensesRows },
                { count: expiringCount },
                { data: renewalMembers },
                { data: allPayments },
            ] = await Promise.all([
                supabase.from('members').select('*', { count: 'exact', head: true }),
                supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                supabase
                    .from('check_ins')
                    .select('*', { count: 'exact', head: true })
                    .gte('check_in_time', `${today}T00:00:00`)
                    .lt('check_in_time', `${today}T23:59:59`),
                supabase
                    .from('payments')
                    .select('amount')
                    .eq('payment_date', today)
                    .eq('payment_status', 'paid'),
                supabase
                    .from('payments')
                    .select('amount')
                    .eq('payment_status', 'pending'),
                supabase
                    .from('payments')
                    .select('amount')
                    .eq('payment_status', 'paid')
                    .gte('payment_date', `${today.slice(0, 7)}-01`)
                    .lte('payment_date', today),
                supabase
                    .from('expenses')
                    .select('amount')
                    .gte('expense_date', `${today.slice(0, 7)}-01`)
                    .lte('expense_date', today),
                supabase
                    .from('members')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active')
                    .eq('membership_expiry_date', today),
                supabase
                    .from('members')
                    .select(`
                        id,
                        full_name,
                        member_id,
                        photo_url,
                        status,
                        membership_expiry_date,
                        membership_plan:membership_plans(name)
                    `)
                    .not('membership_expiry_date', 'is', null)
                    .order('membership_expiry_date', { ascending: true })
                    .limit(24),
                supabase
                    .from('payments')
                    .select('amount, payment_date')
                    .eq('payment_status', 'paid')
                    .gte('payment_date', days[0])
                    .lte('payment_date', today),
            ])

            const revenueByDate: Record<string, number> = {}
            ;(allPayments as { payment_date: string; amount: number }[] | null)?.forEach((payment) => {
                revenueByDate[payment.payment_date] = (revenueByDate[payment.payment_date] || 0) + toSafeAmount(payment.amount)
            })

            const revenueChart = days.map((day) => ({
                date: new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                revenue: revenueByDate[day] || 0,
            }))

            setData({
                totalMembers: totalMembers || 0,
                activeMembers: activeMembers || 0,
                pendingCollection: sumAmounts(pendingPayments as Array<{ amount: unknown }> | null),
                todayRevenue: sumAmounts(todayPayments as Array<{ amount: unknown }> | null),
                monthRevenue: sumAmounts(monthPayments as Array<{ amount: unknown }> | null),
                monthExpenses: sumAmounts(monthExpensesRows as Array<{ amount: unknown }> | null),
                todayPaymentsCount: todayPayments?.length || 0,
                todayCheckIns: todayCheckIns || 0,
                expiringCount: expiringCount || 0,
                revenueChart,
                renewals: (renewalMembers || []) as DashboardData['renewals'],
            })
            setLoading(false)
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-28 rounded-2xl bg-slate-200" />
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, index) => (
                        <div key={index} className="h-36 rounded-2xl bg-slate-200" />
                    ))}
                </div>
                <div className="h-72 rounded-2xl bg-slate-200" />
                <div className="h-64 rounded-2xl bg-slate-200" />
            </div>
        )
    }

    if (!data) return null

    const selectedRange = RANGES.find((range) => range.label === chartRange)?.days ?? 30
    const chartData = selectedRange === Infinity ? data.revenueChart : data.revenueChart.slice(-selectedRange)
    const todayTs = new Date(`${new Date().toISOString().split('T')[0]}T00:00:00`).getTime()
    const expiringMembers = data.renewals
        .filter((member) => {
            if (!member.membership_expiry_date) return false
            const diffDays = Math.ceil((new Date(`${member.membership_expiry_date}T00:00:00`).getTime() - todayTs) / 86400000)
            return diffDays >= 0 && diffDays <= 30
        })
        .sort((a, b) => new Date(a.membership_expiry_date || '').getTime() - new Date(b.membership_expiry_date || '').getTime())
        .slice(0, 5)
    const overdueMembers = data.renewals
        .filter((member) => {
            if (!member.membership_expiry_date) return false
            return new Date(`${member.membership_expiry_date}T00:00:00`).getTime() < todayTs
        })
        .sort((a, b) => new Date(a.membership_expiry_date || '').getTime() - new Date(b.membership_expiry_date || '').getTime())
        .slice(0, 5)
    const visibleRenewals = renewalTab === 'expires' ? expiringMembers : overdueMembers

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f5be1] via-[#1266ea] to-[#0d4bc2] px-5 py-5 text-white shadow-[0_20px_48px_rgba(15,91,225,0.24)]">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-100/80">Admin Dashboard</p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Today&apos;s gym pulse</h1>
                    </div>
                    <div className="hidden rounded-2xl bg-white/12 px-4 py-3 text-right text-sm shadow-inner shadow-white/10 sm:block">
                        <p className="text-blue-100/80">Paid entries today</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{data.todayPaymentsCount}</p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center sm:max-w-md">
                    <div className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur">
                        <p className="text-xl font-semibold">{data.activeMembers}</p>
                        <p className="mt-1 text-[11px] text-blue-100/80">Active members</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur">
                        <p className="text-xl font-semibold">{data.todayCheckIns}</p>
                        <p className="mt-1 text-[11px] text-blue-100/80">Check-ins</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur">
                        <p className="text-xl font-semibold">{data.expiringCount}</p>
                        <p className="mt-1 text-[11px] text-blue-100/80">Renew soon</p>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
                <OverviewCard
                    title="Active Members"
                    value={data.activeMembers.toLocaleString()}
                    icon={<Users className="h-5 w-5" />}
                    accent="green"
                />
                <OverviewCard
                    title="Pending Collection"
                    value={formatCurrency(data.pendingCollection)}
                    icon={<CreditCard className="h-5 w-5" />}
                    accent={data.pendingCollection > 0 ? 'red' : 'blue'}
                />
                <OverviewCard
                    title="Today Collection"
                    value={formatCurrency(data.todayRevenue)}
                    icon={<DollarSign className="h-5 w-5" />}
                    accent="green"
                />
                <OverviewCard
                    title="Today Plan Expiry"
                    value={data.expiringCount.toLocaleString()}
                    icon={<AlertCircle className="h-5 w-5" />}
                    accent={data.expiringCount > 0 ? 'red' : 'blue'}
                />
                <OverviewCard
                    title="Month Collection"
                    value={formatCurrency(data.monthRevenue)}
                    icon={<DollarSign className="h-5 w-5" />}
                    accent="green"
                />
                <OverviewCard
                    title="Month Expenses"
                    value={formatCurrency(data.monthExpenses)}
                    icon={<TrendingDown className="h-5 w-5" />}
                    accent={data.monthExpenses > 0 ? 'red' : 'blue'}
                />
            </section>

            <div className="grid gap-5">
                <SectionShell
                    title="Revenue Overview"
                    subtitle={
                        chartRange === '1D'
                            ? "Today's revenue"
                            : chartRange === 'Max'
                                ? 'All time revenue'
                                : `Last ${chartRange} revenue trend`
                    }
                    mobileStackAction
                    action={
                        <div className="w-full sm:w-auto sm:max-w-[20rem]">
                            <div className="flex w-full items-center gap-1 rounded-2xl bg-slate-100 p-1">
                                {RANGES.map((range) => (
                                    <button
                                        key={range.label}
                                        onClick={() => setChartRange(range.label)}
                                        className={`min-w-0 flex-1 rounded-xl px-0 py-1.5 text-[8px] font-medium transition sm:text-[6px] ${
                                            chartRange === range.label
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    }
                >
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf8" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#7c8aa5' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={
                                        chartRange === '1D'
                                            ? 0
                                            : chartRange === '5D'
                                                ? 0
                                                : chartRange === '1M'
                                                    ? 4
                                                    : chartRange === '1Y'
                                                        ? 29
                                                        : 89
                                    }
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#7c8aa5' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `Rs ${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`}
                                    width={48}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#0f5be1"
                                    strokeWidth={3}
                                    dot={{ r: 0 }}
                                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: '#0f5be1' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </SectionShell>
            </div>

            <SectionShell
                title="Renewals"
                subtitle="Memberships that need attention"
                action={
                    <Link
                        href="/admin/members"
                        className="flex items-center gap-1 text-[13px] font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                }
            >
                <div className="mb-4 rounded-2xl bg-slate-100 p-1">
                    <div className="grid grid-cols-2 gap-1">
                        <button
                            onClick={() => setRenewalTab('expires')}
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                                renewalTab === 'expires' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                            <span>Expires</span>
                            <span className="rounded-full bg-[#0f5be1] px-2.5 py-0.5 text-xs font-semibold text-white">
                                {expiringMembers.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setRenewalTab('overdues')}
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                                renewalTab === 'overdues' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                            <span>Overdues</span>
                            <span className="rounded-full bg-[#0f5be1] px-2.5 py-0.5 text-xs font-semibold text-white">
                                {overdueMembers.length}
                            </span>
                        </button>
                    </div>
                </div>

                {visibleRenewals.length > 0 ? (
                    <div className="space-y-4">
                        {visibleRenewals.map((member) => {
                            const initials = member.full_name
                                .split(' ')
                                .map((name) => name[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || '?'

                            return (
                                <div key={member.id} className="flex items-center gap-3 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                                    <Avatar className="h-16 w-16 shrink-0">
                                        <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                                        <AvatarFallback className="bg-blue-100 text-sm font-semibold text-blue-700">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-base font-medium text-blue-600">{member.full_name}</p>
                                        <p className="truncate text-[15px] text-slate-900">
                                            {(member.membership_plan as { name?: string } | null)?.name || 'Membership Plan'}
                                        </p>
                                        <p className="text-[15px] text-slate-900">Monthly Fees</p>
                                        <p className="mt-1 text-[15px] text-slate-400">
                                            ends on {formatExpiryDate(member.membership_expiry_date)}
                                        </p>
                                    </div>

                                    <LoadingLinkButton
                                        href="/admin/payments/record"
                                        loadingText=""
                                        className="rounded-full bg-slate-200 px-5 py-2 text-base font-medium text-slate-800 shadow-none hover:bg-slate-300"
                                    >
                                        Renew
                                    </LoadingLinkButton>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="rounded-[1.5rem] bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                        No members in this list right now
                    </div>
                )}
            </SectionShell>

            <div className="fixed bottom-6 right-5 z-30 lg:hidden">
                <div className="mb-3 flex flex-col items-center gap-3">
                    {quickActionsOpen ? (
                        <>
                            <LoadingLinkButton
                                href="/admin/payments/record"
                                loadingText=""
                                showDefaultLoader={false}
                                className="group flex h-auto w-24 flex-col items-center gap-1.5 bg-transparent p-0 text-slate-800 shadow-none hover:bg-transparent"
                            >
                                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]">
                                    <CreditCard className="h-4 w-4 transition-opacity group-data-[loading=true]:opacity-0" />
                                    <Loader2 className="absolute h-4 w-4 animate-spin opacity-0 transition-opacity group-data-[loading=true]:opacity-100" />
                                </span>
                                <span className="rounded-full bg-white/70 px-2.5 py-1 text-center text-[11px] font-medium leading-none text-slate-700 shadow-sm backdrop-blur-md">
                                    Record Payment
                                </span>
                            </LoadingLinkButton>
                            <LoadingLinkButton
                                href="/admin/members/add"
                                loadingText=""
                                showDefaultLoader={false}
                                className="group flex h-auto w-24 flex-col items-center gap-1.5 bg-transparent p-0 text-slate-800 shadow-none hover:bg-transparent"
                            >
                                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]">
                                    <Plus className="h-4 w-4 transition-opacity group-data-[loading=true]:opacity-0" />
                                    <Loader2 className="absolute h-4 w-4 animate-spin opacity-0 transition-opacity group-data-[loading=true]:opacity-100" />
                                </span>
                                <span className="rounded-full bg-white/70 px-2.5 py-1 text-center text-[11px] font-medium leading-none text-slate-700 shadow-sm backdrop-blur-md">
                                    Add Member
                                </span>
                            </LoadingLinkButton>
                        </>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => setQuickActionsOpen((open) => !open)}
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_20px_40px_rgba(15,91,225,0.35)] transition-all hover:scale-105 ${
                        quickActionsOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0f5be1] hover:bg-[#0c4ec6]'
                    }`}
                    aria-label={quickActionsOpen ? 'Close quick actions' : 'Open quick actions'}
                >
                    <Plus className={`h-7 w-7 transition-transform ${quickActionsOpen ? 'rotate-45' : ''}`} />
                </button>
            </div>
        </div>
    )
}

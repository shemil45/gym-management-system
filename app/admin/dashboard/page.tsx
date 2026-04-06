'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { getExpiringMembers, getOverdueMembers } from '@/lib/utils/renewals'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRoleLabel } from '@/lib/auth/roles'
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
        membership_plan?: { name: string; price: number } | null
    }[]
}

interface ViewerProfile {
    email: string | null
    full_name: string | null
    phone: string | null
    photo_url: string | null
    role: string | null
}

interface ProfileRow {
    full_name: string | null
    role: string | null
    phone: string | null
    photo_url: string | null
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
    href,
}: {
    title: string
    value: string
    icon: React.ReactNode
    accent: 'blue' | 'green' | 'red'
    href?: string
}) {
    const { isDark } = useAdminTheme()
    const accents = {
        blue: {
            iconBg: isDark ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-blue-100 text-blue-600',
            value: isDark ? 'text-[#10b981]' : 'text-blue-600',
        },
        green: {
            iconBg: isDark ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-emerald-100 text-emerald-600',
            value: isDark ? 'text-[#10b981]' : 'text-emerald-500',
        },
        red: {
            iconBg: isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-500',
            value: isDark ? 'text-red-400' : 'text-red-500',
        },
    }

    const content = (
        <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accents[accent].iconBg}`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`line-clamp-2 min-h-6 text-[0.82rem] font-medium leading-snug sm:text-[0.8rem] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{title}</p>
                <p className={`mt-1 text-left text-[1.1rem] font-semibold leading-tight tracking-tight ${accents[accent].value} sm:text-[1.28rem]`}>
                    {value}
                </p>
            </div>
        </div>
    )

    if (href) {
        return (
            <Link
                href={href}
                className={`block rounded-2xl px-4 py-5 transition-all hover:-translate-y-0.5 sm:px-5 ${
                    isDark
                        ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)] hover:border-[#3a3a3a]'
                        : 'bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)]'
                }`}
            >
                {content}
            </Link>
        )
    }

    return (
        <div className={`rounded-2xl px-4 py-5 sm:px-5 ${
            isDark
                ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
                : 'bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-100'
        }`}>
            {content}
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
    const { isDark } = useAdminTheme()
    return (
        <section className={`rounded-2xl p-4 sm:p-5 ${
            isDark
                ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
                : 'bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100'
        }`}>
            <div className={`mb-4 flex gap-3 ${mobileStackAction ? 'flex-col sm:flex-row sm:items-start sm:justify-between' : 'items-start justify-between'}`}>
                <div>
                    <h2 className={`text-xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
                    {subtitle ? <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>{subtitle}</p> : null}
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
    const { isDark } = useAdminTheme()
    if (active && payload && payload.length) {
        return (
            <div className={`rounded-2xl px-3 py-2 text-xs shadow-lg ${
                isDark
                    ? 'border border-[#2a2a2a] bg-[#161616] text-white'
                    : 'bg-slate-950 text-white'
            }`}>
                <p className="font-medium">{label}</p>
                <p className={isDark ? 'text-[#10b981]' : 'text-blue-300'}>{formatCurrency(payload[0].value)}</p>
            </div>
        )
    }

    return null
}

export default function AdminDashboard() {
    const { isDark } = useAdminTheme()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [viewerProfile, setViewerProfile] = useState<ViewerProfile | null>(null)
    const [profileLoading, setProfileLoading] = useState(true)
    const [chartRange, setChartRange] = useState<RangeLabel>('1M')
    const [renewalTab, setRenewalTab] = useState<'expires' | 'overdues'>('expires')
    const [quickActionsOpen, setQuickActionsOpen] = useState(false)

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient()
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (user) {
                const profileResult = await supabase
                    .from('profiles')
                    .select('full_name, role, phone, photo_url')
                    .eq('id', user.id)
                    .maybeSingle()
                const profile = profileResult.data as ProfileRow | null

                setViewerProfile({
                    email: user.email ?? null,
                    full_name: profile?.full_name ?? user.email?.split('@')[0] ?? null,
                    phone: profile?.phone ?? null,
                    photo_url: profile?.photo_url ?? null,
                    role: profile?.role ?? null,
                })
            } else {
                setViewerProfile(null)
            }
            setProfileLoading(false)

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
                        membership_plan:membership_plans(name, price)
                    `)
                    .not('membership_expiry_date', 'is', null)
                    .order('membership_expiry_date', { ascending: true })
                    ,
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

            const normalizedRenewalMembers = (renewalMembers || []) as DashboardData['renewals']
            const expiringRenewals = getExpiringMembers(normalizedRenewalMembers)
            const overdueRenewals = getOverdueMembers(normalizedRenewalMembers)
            const combinedRenewals = [...expiringRenewals, ...overdueRenewals]
            const uniqueRenewals = Array.from(new Map(combinedRenewals.map((member) => [member.id, member])).values())
            const pendingCollection = uniqueRenewals.reduce(
                (sum, member) => sum + Number(member.membership_plan?.price || 0),
                0
            )

            setData({
                totalMembers: totalMembers || 0,
                activeMembers: activeMembers || 0,
                pendingCollection,
                todayRevenue: sumAmounts(todayPayments as Array<{ amount: unknown }> | null),
                monthRevenue: sumAmounts(monthPayments as Array<{ amount: unknown }> | null),
                monthExpenses: sumAmounts(monthExpensesRows as Array<{ amount: unknown }> | null),
                todayPaymentsCount: todayPayments?.length || 0,
                todayCheckIns: todayCheckIns || 0,
                expiringCount: expiringCount || 0,
                revenueChart,
                renewals: normalizedRenewalMembers,
            })
            setLoading(false)
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className={`h-28 rounded-2xl ${isDark ? 'bg-[#1c1c1c]' : 'bg-slate-200'}`} />
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, index) => (
                        <div key={index} className={`h-36 rounded-2xl ${isDark ? 'bg-[#1c1c1c]' : 'bg-slate-200'}`} />
                    ))}
                </div>
                <div className={`h-72 rounded-2xl ${isDark ? 'bg-[#1c1c1c]' : 'bg-slate-200'}`} />
                <div className={`h-64 rounded-2xl ${isDark ? 'bg-[#1c1c1c]' : 'bg-slate-200'}`} />
            </div>
        )
    }

    if (!data) return null

    const selectedRange = RANGES.find((range) => range.label === chartRange)?.days ?? 30
    const chartData = selectedRange === Infinity ? data.revenueChart : data.revenueChart.slice(-selectedRange)
    const expiringMembers = getExpiringMembers(data.renewals)
    const overdueMembers = getOverdueMembers(data.renewals)
    const visibleRenewals = (renewalTab === 'expires' ? expiringMembers : overdueMembers).slice(0, 5)
    const viewerInitials = viewerProfile?.full_name
        ?.split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'

    return (
        <div className="space-y-5">
            <section
                className={`-mx-4 -mt-5 overflow-hidden rounded-b-3xl px-4 py-6 text-white sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 ${
                    isDark ? 'border-b border-[#2a2a2a]' : 'border-b border-blue-500/20'
                }`}
                style={{ background: isDark ? '#1a1a1a' : '#1266ea' }}
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className={`h-14 w-14 shrink-0 ring-2 sm:h-16 sm:w-16 ${isDark ? 'ring-white/10' : 'ring-white/15'}`}>
                        <AvatarImage src={viewerProfile?.photo_url || undefined} alt={viewerProfile?.full_name || 'User profile'} />
                        <AvatarFallback className={`${isDark ? 'bg-[#242424]' : 'bg-slate-900/45'} text-base font-semibold text-white sm:text-lg`}>
                            {viewerInitials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                        {profileLoading ? (
                            <div className="mt-2 space-y-1.5">
                                <div className="h-5 w-36 animate-pulse rounded-full bg-white/15" />
                                <div className="h-4 w-20 animate-pulse rounded-full bg-white/10" />
                                <div className="h-3.5 w-44 animate-pulse rounded-full bg-white/10" />
                                <div className="h-3.5 w-28 animate-pulse rounded-full bg-white/10" />
                            </div>
                        ) : viewerProfile ? (
                            <div className="mt-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <h1 className="truncate text-[1.45rem] font-semibold leading-tight tracking-tight sm:text-[1.65rem]">
                                        {viewerProfile.full_name || 'Staff User'}
                                    </h1>
                                    {viewerProfile.role ? (
                                        <Badge
                                            variant="outline"
                                            className={`px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                                isDark
                                                    ? 'border-[#10b981]/30 bg-[#10b981]/10 text-[#8df0c9]'
                                                    : 'border-white/15 bg-white/12 text-white'
                                            }`}
                                        >
                                            {formatRoleLabel(viewerProfile.role)}
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className={`mt-1 truncate text-[12px] leading-tight sm:text-[13px] ${isDark ? 'text-zinc-300' : 'text-blue-100/90'}`}>
                                    {viewerProfile.email || 'No email available'}
                                </p>
                                <p className={`mt-0.5 text-[12px] leading-tight sm:text-[13px] ${isDark ? 'text-zinc-400' : 'text-blue-100/78'}`}>
                                    {viewerProfile.phone || 'Phone not added'}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-1.5">
                                <h1 className="text-lg font-semibold tracking-tight">Profile unavailable</h1>
                                <p className={`mt-1 max-w-md text-[12px] sm:text-[13px] ${isDark ? 'text-zinc-400' : 'text-blue-100/85'}`}>
                                    We couldn&apos;t load your profile details right now. Please check that your `profiles` row exists.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
                <OverviewCard
                    title="Active Members"
                    value={data.activeMembers.toLocaleString()}
                    icon={<Users className="h-5 w-5" />}
                    accent="green"
                    href="/admin/members?status=active"
                />
                <OverviewCard
                    title="Pending Collection"
                    value={formatCurrency(data.pendingCollection)}
                    icon={<CreditCard className="h-5 w-5" />}
                    accent={data.pendingCollection > 0 ? 'red' : 'blue'}
                    href="/admin/members?filter=renewals"
                />
                <OverviewCard
                    title="Today Collection"
                    value={formatCurrency(data.todayRevenue)}
                    icon={<DollarSign className="h-5 w-5" />}
                    accent="green"
                    href="/admin/finances/payments?date=today&type=collection"
                />
                <OverviewCard
                    title="Today Plan Expiry"
                    value={data.expiringCount.toLocaleString()}
                    icon={<AlertCircle className="h-5 w-5" />}
                    accent={data.expiringCount > 0 ? 'red' : 'blue'}
                    href="/admin/members?planExpiry=today"
                />
                <OverviewCard
                    title="Month Collection"
                    value={formatCurrency(data.monthRevenue)}
                    icon={<DollarSign className="h-5 w-5" />}
                    accent="green"
                    href="/admin/finances/payments?date=month&type=collection"
                />
                <OverviewCard
                    title="Month Expenses"
                    value={formatCurrency(data.monthExpenses)}
                    icon={<TrendingDown className="h-5 w-5" />}
                    accent={data.monthExpenses > 0 ? 'red' : 'blue'}
                    href="/admin/finances/expenses?date=month&type=expense"
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
                        <div className="w-full sm:w-auto sm:min-w-[20rem] sm:max-w-[24rem]">
                            <div className={`flex w-full items-center gap-1 rounded-2xl p-1 sm:gap-1.5 sm:p-1.5 ${
                                isDark
                                    ? 'border border-[#2a2a2a] bg-[#161616]'
                                    : 'bg-slate-100'
                            }`}>
                                {RANGES.map((range) => (
                                    <button
                                        key={range.label}
                                        onClick={() => setChartRange(range.label)}
                                        className={`min-w-0 flex-1 rounded-xl px-0 py-1.5 text-[10px] font-medium transition sm:px-2 sm:py-2 ${
                                            chartRange === range.label
                                                ? isDark
                                                    ? 'bg-[#222222] text-white shadow-sm'
                                                    : 'bg-white text-slate-900 shadow-sm'
                                                : isDark
                                                    ? 'text-zinc-400 hover:text-zinc-200'
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
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2a2a2a' : '#e5edf8'} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: isDark ? '#8a8a8a' : '#7c8aa5' }}
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
                                    tick={{ fontSize: 10, fill: isDark ? '#8a8a8a' : '#7c8aa5' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `Rs ${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`}
                                    width={48}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke={isDark ? '#10b981' : '#0f5be1'}
                                    strokeWidth={3}
                                    dot={{ r: 0 }}
                                    activeDot={{ r: 5, stroke: isDark ? '#171717' : '#ffffff', strokeWidth: 2, fill: isDark ? '#10b981' : '#0f5be1' }}
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
                        href={renewalTab === 'expires' ? '/admin/members?filter=expires' : '/admin/members?filter=overdue'}
                        className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${
                            isDark ? 'text-zinc-300 hover:text-white' : 'text-blue-600 hover:text-blue-700'
                        }`}
                    >
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                }
            >
                <div className={`mb-4 rounded-2xl p-1 ${isDark ? 'border border-[#2a2a2a] bg-[#161616]' : 'bg-slate-100'}`}>
                    <div className="grid grid-cols-2 gap-1">
                        <button
                            onClick={() => setRenewalTab('expires')}
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                                renewalTab === 'expires'
                                    ? isDark
                                        ? 'bg-[#222222] text-white shadow-sm'
                                        : 'bg-white text-slate-800 shadow-sm'
                                    : isDark
                                        ? 'text-zinc-400'
                                        : 'text-slate-500'
                            }`}
                        >
                            <span>Expires</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${isDark ? 'bg-[#10b981]' : 'bg-[#0f5be1]'}`}>
                                {expiringMembers.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setRenewalTab('overdues')}
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                                renewalTab === 'overdues'
                                    ? isDark
                                        ? 'bg-[#222222] text-white shadow-sm'
                                        : 'bg-white text-slate-800 shadow-sm'
                                    : isDark
                                        ? 'text-zinc-400'
                                        : 'text-slate-500'
                            }`}
                        >
                            <span>Overdues</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${isDark ? 'bg-[#10b981]' : 'bg-[#0f5be1]'}`}>
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
                                <div key={member.id} className={`flex items-center gap-3 pb-4 last:border-b-0 last:pb-0 ${isDark ? 'border-b border-[#2a2a2a]' : 'border-b border-slate-200'}`}>
                                    <Avatar className="h-16 w-16 shrink-0">
                                        <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                                        <AvatarFallback className={`${isDark ? 'bg-[#10b981]/15 text-[#8df0c9]' : 'bg-blue-100 text-blue-700'} text-sm font-semibold`}>
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate text-base font-medium ${isDark ? 'text-white' : 'text-blue-600'}`}>{member.full_name}</p>
                                        <p className={`truncate text-[13px] ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                                            {(member.membership_plan as { name?: string } | null)?.name || 'Membership Plan'}
                                        </p>
                                        <p className={`text-[13px] ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>Monthly Fees</p>
                                        <p className={`mt-1 text-[13px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                            ends on {formatExpiryDate(member.membership_expiry_date)}
                                        </p>
                                    </div>

                                    <LoadingLinkButton
                                        href="/admin/finances/payments/record"
                                        loadingText=""
                                        className={`rounded-full px-4 py-2 text-sm font-medium shadow-none ${
                                            isDark
                                                ? 'border border-[#2a2a2a] bg-[#161616] text-white hover:bg-[#222222]'
                                                : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                        }`}
                                    >
                                        Renew
                                    </LoadingLinkButton>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className={`rounded-[1.5rem] px-4 py-10 text-center text-sm ${
                        isDark
                            ? 'border border-[#2a2a2a] bg-[#161616] text-zinc-500'
                            : 'bg-slate-50 text-slate-400'
                    }`}>
                        No members in this list right now
                    </div>
                )}
            </SectionShell>

            <div className="fixed bottom-6 right-5 z-30 lg:hidden">
                <div className="mb-3 flex flex-col items-center gap-3">
                    {quickActionsOpen ? (
                        <>
                            <LoadingLinkButton
                                href="/admin/finances/payments/record"
                                loadingText=""
                                showDefaultLoader={false}
                                className={`group flex h-auto w-24 flex-col items-center gap-1.5 bg-transparent p-0 shadow-none hover:bg-transparent ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}
                            >
                                <span className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white ${
                                    isDark
                                        ? 'bg-[#10b981] shadow-[0_16px_32px_rgba(16,185,129,0.22)]'
                                        : 'bg-emerald-500 shadow-[0_16px_32px_rgba(15,23,42,0.18)]'
                                }`}>
                                    <CreditCard className="h-4 w-4 transition-opacity group-data-[loading=true]:opacity-0" />
                                    <Loader2 className="absolute h-4 w-4 animate-spin opacity-0 transition-opacity group-data-[loading=true]:opacity-100" />
                                </span>
                                <span className={`rounded-full px-2.5 py-1 text-center text-[11px] font-medium leading-none shadow-sm backdrop-blur-md ${
                                    isDark
                                        ? 'border border-[#2a2a2a] bg-[#1c1c1c]/95 text-zinc-200'
                                        : 'bg-white/70 text-slate-700'
                                }`}>
                                    Record Payment
                                </span>
                            </LoadingLinkButton>
                            <LoadingLinkButton
                                href="/admin/members/add"
                                loadingText=""
                                showDefaultLoader={false}
                                className={`group flex h-auto w-24 flex-col items-center gap-1.5 bg-transparent p-0 shadow-none hover:bg-transparent ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}
                            >
                                <span className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white ${
                                    isDark
                                        ? 'bg-[#10b981] shadow-[0_16px_32px_rgba(16,185,129,0.22)]'
                                        : 'bg-[#0f5be1] shadow-[0_16px_32px_rgba(15,23,42,0.18)]'
                                }`}>
                                    <Plus className="h-4 w-4 transition-opacity group-data-[loading=true]:opacity-0" />
                                    <Loader2 className="absolute h-4 w-4 animate-spin opacity-0 transition-opacity group-data-[loading=true]:opacity-100" />
                                </span>
                                <span className={`rounded-full px-2.5 py-1 text-center text-[11px] font-medium leading-none shadow-sm backdrop-blur-md ${
                                    isDark
                                        ? 'border border-[#2a2a2a] bg-[#1c1c1c]/95 text-zinc-200'
                                        : 'bg-white/70 text-slate-700'
                                }`}>
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
                        quickActionsOpen
                            ? isDark
                                ? 'bg-zinc-700 hover:bg-zinc-600'
                                : 'bg-red-500 hover:bg-red-600'
                            : isDark
                                ? 'bg-[#10b981] hover:bg-[#0ea271]'
                                : 'bg-[#0f5be1] hover:bg-[#0c4ec6]'
                    }`}
                    aria-label={quickActionsOpen ? 'Close quick actions' : 'Open quick actions'}
                >
                    <Plus className={`h-7 w-7 transition-transform ${quickActionsOpen ? 'rotate-45' : ''}`} />
                </button>
            </div>
        </div>
    )
}

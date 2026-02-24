'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import {
    Users,
    DollarSign,
    UserCheck,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Plus,
    CreditCard,
    LogIn,
    ArrowRight,
} from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface DashboardData {
    totalMembers: number
    activeMembers: number
    todayRevenue: number
    todayPaymentsCount: number
    todayCheckIns: number
    expiringCount: number
    revenueChart: { date: string; revenue: number }[]
    recentCheckIns: {
        id: string
        check_in_time: string
        member: { member_id: string; full_name: string; status: string; membership_plan?: { name: string } | null } | null
    }[]
}

function StatCard({
    title,
    value,
    icon,
    iconBg,
    trend,
    trendLabel,
}: {
    title: string
    value: string | number
    icon: React.ReactNode
    iconBg: string
    trend?: number
    trendLabel?: string
}) {
    const isPositive = (trend ?? 0) >= 0
    return (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {trend !== undefined && (
                        <div className="flex items-center gap-1 mt-2">
                            {isPositive ? (
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span
                                className={`text-[11px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}
                            >
                                {isPositive ? '+' : ''}{trend}% {trendLabel}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
                    {icon}
                </div>
            </div>
        </div>
    )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
                <p className="font-medium">{label}</p>
                <p className="text-blue-300">{formatCurrency(payload[0].value)}</p>
            </div>
        )
    }
    return null
}

const RANGES = [
    { label: '1D', days: 1 },
    { label: '5D', days: 5 },
    { label: '1M', days: 30 },
    { label: '1Y', days: 365 },
    { label: '5Y', days: 365 * 5 },
    { label: 'Max', days: Infinity },
] as const

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [chartRange, setChartRange] = useState<'1D' | '5D' | '1M' | '1Y' | '5Y' | 'Max'>('1M')

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient()

            const today = new Date().toISOString().split('T')[0]
            const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

            // Build 365-day date range for revenue chart (so all ranges work)
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
                { count: expiringCount },
                { data: recentCheckIns },
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
                    .from('members')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active')
                    .gte('membership_expiry_date', today)
                    .lte('membership_expiry_date', weekFromNow),
                supabase
                    .from('check_ins')
                    .select(`
                        id, check_in_time,
                        member:members(member_id, full_name, status, membership_plan:membership_plans(name))
                    `)
                    .order('check_in_time', { ascending: false })
                    .limit(8),
                supabase
                    .from('payments')
                    .select('amount, payment_date')
                    .eq('payment_status', 'paid')
                    .gte('payment_date', days[0])
                    .lte('payment_date', today),
            ])

            // Build chart data
            const revenueByDate: Record<string, number> = {}
                ; (allPayments as { payment_date: string; amount: number }[] | null)?.forEach((p) => {
                    revenueByDate[p.payment_date] = (revenueByDate[p.payment_date] || 0) + Number(p.amount)
                })
            const revenueChart = days.map((d) => ({
                date: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                revenue: revenueByDate[d] || 0,
            }))

            setData({
                totalMembers: totalMembers || 0,
                activeMembers: activeMembers || 0,
                todayRevenue: (todayPayments as { amount: number }[] | null)?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
                todayPaymentsCount: todayPayments?.length || 0,
                todayCheckIns: todayCheckIns || 0,
                expiringCount: expiringCount || 0,
                revenueChart,
                recentCheckIns: (recentCheckIns || []) as DashboardData['recentCheckIns'],
            })
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-gray-200 rounded" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 bg-gray-200 rounded-xl" />
                    ))}
                </div>
                <div className="h-72 bg-gray-200 rounded-xl" />
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-sm text-gray-500 mt-0.5">Welcome back, here&apos;s what&apos;s happening today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Members"
                    value={data.totalMembers.toLocaleString()}
                    icon={<Users className="h-5 w-5 text-blue-600" />}
                    iconBg="bg-blue-50"
                    trend={1.12}
                    trendLabel="from last month"
                />
                <StatCard
                    title="Today's Revenue"
                    value={formatCurrency(data.todayRevenue)}
                    icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                    iconBg="bg-emerald-50"
                    trend={1.8}
                    trendLabel="from last month"
                />
                <StatCard
                    title="Today's Check-ins"
                    value={data.todayCheckIns.toLocaleString()}
                    icon={<UserCheck className="h-5 w-5 text-violet-600" />}
                    iconBg="bg-violet-50"
                    trend={-1.3}
                    trendLabel="from last month"
                />
                <StatCard
                    title="Members Expiring This Week"
                    value={data.expiringCount}
                    icon={<AlertCircle className="h-5 w-5 text-orange-500" />}
                    iconBg="bg-orange-50"
                />
            </div>

            {/* Revenue Chart */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Revenue Overview</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {RANGES.find((r) => r.label === chartRange)?.label === '1D'
                                ? 'Today\'s revenue'
                                : chartRange === 'Max'
                                    ? 'All time revenue'
                                    : `Last ${chartRange} revenue trend`}
                        </p>
                    </div>
                    {/* Range Selector */}
                    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-1">
                        {RANGES.map((r) => (
                            <button
                                key={r.label}
                                onClick={() => setChartRange(r.label as typeof chartRange)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${chartRange === r.label
                                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                        data={(() => {
                            const rangeDays = RANGES.find((r) => r.label === chartRange)?.days ?? 30
                            return rangeDays === Infinity
                                ? data.revenueChart
                                : data.revenueChart.slice(-rangeDays)
                        })()}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                            interval={
                                chartRange === '1D' ? 0
                                    : chartRange === '5D' ? 0
                                        : chartRange === '1M' ? 4
                                            : chartRange === '1Y' ? 29   // ~monthly tick
                                                : chartRange === '5Y' ? 89  // ~quarterly tick
                                                    : 89                          // Max — quarterly
                            }
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                            width={45}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Check-ins */}
                <div className="lg:col-span-2 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Recent Check-ins</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Latest member activity</p>
                        </div>
                        <Link
                            href="/admin/check-ins"
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            View All <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-4 gap-2 mb-2 px-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Member Name</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Membership</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Check-In Time</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</span>
                    </div>

                    <div className="space-y-1">
                        {data.recentCheckIns.length > 0 ? (
                            data.recentCheckIns.map((checkIn) => {
                                const member = checkIn.member
                                const initials = member?.full_name
                                    ?.split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2) || '?'
                                const time = new Date(checkIn.check_in_time).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                })
                                const status = member?.status || 'inactive'
                                return (
                                    <div
                                        key={checkIn.id}
                                        className="grid grid-cols-4 gap-2 items-center rounded-lg px-2 py-2.5 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7 text-[10px]">
                                                <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-semibold">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-medium text-gray-800 truncate">
                                                {member?.full_name || 'Unknown'}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 truncate">
                                            {(member?.membership_plan as { name?: string } | null)?.name || '—'}
                                        </span>
                                        <span className="text-xs text-gray-500">{time}</span>
                                        <div>
                                            <Badge
                                                className={`text-[10px] px-2 py-0.5 font-medium border-0 ${status === 'active'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : status === 'expired'
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {status === 'active' ? 'Active' : status === 'expired' ? 'Expiring Soon' : status}
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="py-8 text-center text-xs text-gray-400">No check-ins today yet</div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-3 gap-3">
                        <Link href="/admin/members/add" className="group flex flex-col items-center gap-2">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30 group-hover:bg-blue-700 transition-colors">
                                <Plus className="h-6 w-6" />
                            </div>
                            <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">Add Member</span>
                        </Link>
                        <Link href="/admin/payments/record" className="group flex flex-col items-center gap-2">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 group-hover:bg-emerald-600 transition-colors">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">Record Payment</span>
                        </Link>
                        <Link href="/admin/check-ins" className="group flex flex-col items-center gap-2">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500 text-white shadow-md shadow-violet-500/30 group-hover:bg-violet-600 transition-colors">
                                <LogIn className="h-6 w-6" />
                            </div>
                            <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">Manual Check-in</span>
                        </Link>
                    </div>

                    {/* Mini stats */}
                    <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Active Members</span>
                            <span className="text-xs font-semibold text-gray-800">{data.activeMembers.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Today&apos;s Payments</span>
                            <span className="text-xs font-semibold text-gray-800">{data.todayPaymentsCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Expiring This Week</span>
                            <span className={`text-xs font-semibold ${data.expiringCount > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                                {data.expiringCount}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

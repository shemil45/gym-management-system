'use client'

import { useState, useMemo } from 'react'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
} from 'recharts'
import {
    Users,
    UserCheck,
    AlertCircle,
    CreditCard,
    Phone,
    Calendar,
    TrendingUp,
    Clock,
    Award,
    Banknote,
    Smartphone,
    Building2,
    Globe,
    Wallet,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRow {
    id: string
    full_name: string
    member_id: string
    phone: string
    status: string
    membership_expiry_date: string | null
    created_at: string
    membership_plan: { name: string } | null
}

interface CheckInRow {
    member_id: string
    check_in_time: string
}

interface PaymentRow {
    id: string
    member_id: string
    amount: number
    payment_method: string
    payment_status: string
    payment_date: string
    member: { full_name: string; member_id: string; phone: string } | null
}

interface ReportsDashboardProps {
    members: MemberRow[]
    checkIns: CheckInRow[]
    payments: PaymentRow[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'membership', label: 'Membership', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
    { id: 'renewals', label: 'Renewals', icon: AlertCircle },
    { id: 'payments', label: 'Payments', icon: CreditCard },
] as const

type TabId = (typeof TABS)[number]['id']

const PLAN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4']

const METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    cash: { label: 'Cash', icon: <Banknote className="h-3.5 w-3.5" />, color: '#10b981' },
    upi: { label: 'UPI', icon: <Smartphone className="h-3.5 w-3.5" />, color: '#8b5cf6' },
    card: { label: 'Card', icon: <CreditCard className="h-3.5 w-3.5" />, color: '#3b82f6' },
    bank_transfer: { label: 'Bank Transfer', icon: <Building2 className="h-3.5 w-3.5" />, color: '#f59e0b' },
    online: { label: 'Online', icon: <Globe className="h-3.5 w-3.5" />, color: '#06b6d4' },
}

const STATUS_COLORS: Record<string, string> = {
    active: '#10b981',
    expired: '#f43f5e',
    inactive: '#9ca3af',
    frozen: '#3b82f6',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CustomTooltip = ({
    active, payload, label,
}: {
    active?: boolean; payload?: { name: string; value: number }[]; label?: string
}) => {
    if (active && payload?.length) {
        return (
            <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl">
                <p className="font-semibold mb-1">{label}</p>
                {payload.map((p) => (
                    <p key={p.name}>{p.name}: <span className="font-bold">{typeof p.value === 'number' && p.name.toLowerCase().includes('revenue') ? formatCurrency(p.value) : p.value}</span></p>
                ))}
            </div>
        )
    }
    return null
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                {icon}
            </div>
            <div>
                <h2 className="text-sm font-bold text-gray-900">{title}</h2>
                {sub && <p className="text-xs text-gray-400">{sub}</p>}
            </div>
        </div>
    )
}

function KPICard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' }) {
    const cls = {
        blue: 'border-blue-100 bg-blue-50 text-blue-700',
        green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        red: 'border-rose-100 bg-rose-50 text-rose-600',
        amber: 'border-amber-100 bg-amber-50 text-amber-700',
        purple: 'border-violet-100 bg-violet-50 text-violet-700',
    }[color]
    return (
        <div className={`rounded-xl border px-4 py-3 ${cls}`}>
            <p className="text-[11px] font-medium opacity-70">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
        </div>
    )
}

// ─── Tab 1: Membership ────────────────────────────────────────────────────────

function MembershipReport({ members }: { members: MemberRow[] }) {
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        members.forEach((m) => {
            counts[m.status] = (counts[m.status] || 0) + 1
        })
        return Object.entries(counts).map(([status, count]) => ({ status, count }))
    }, [members])

    const planCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        members.forEach((m) => {
            const name = m.membership_plan?.name ?? 'No Plan'
            counts[name] = (counts[name] || 0) + 1
        })
        return Object.entries(counts)
            .map(([plan, count]) => ({ plan, count }))
            .sort((a, b) => b.count - a.count)
    }, [members])

    // New members by month (last 12)
    const newByMonth = useMemo(() => {
        const months: { key: string; label: string }[] = []
        for (let i = 11; i >= 0; i--) {
            const d = new Date()
            d.setDate(1)
            d.setMonth(d.getMonth() - i)
            months.push({
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            })
        }
        const byMonth: Record<string, number> = {}
        members.forEach((m) => {
            const key = m.created_at.slice(0, 7)
            byMonth[key] = (byMonth[key] || 0) + 1
        })
        return months.map((m) => ({ month: m.label, 'New Members': byMonth[m.key] || 0 }))
    }, [members])

    const activeCount = members.filter((m) => m.status === 'active').length
    const expiredCount = members.filter((m) => m.status === 'expired').length

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KPICard label="Total Members" value={members.length} color="blue" />
                <KPICard label="Active" value={activeCount} color="green" />
                <KPICard label="Expired" value={expiredCount} color="red" />
                <KPICard label="Retention Rate" value={`${members.length > 0 ? Math.round((activeCount / members.length) * 100) : 0}%`} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* New members chart */}
                <div className="lg:col-span-2 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <SectionHeader icon={<TrendingUp className="h-4 w-4 text-blue-600" />} title="New Members" sub="Last 12 months" />
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={newByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="New Members" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status + Plan breakdown */}
                <div className="space-y-4">
                    {/* Status donut */}
                    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                        <SectionHeader icon={<Users className="h-4 w-4 text-blue-600" />} title="Status Breakdown" />
                        <div className="flex items-center gap-3">
                            <PieChart width={90} height={90}>
                                <Pie data={statusCounts} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={24} outerRadius={40}>
                                    {statusCounts.map((entry) => (
                                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#9ca3af'} />
                                    ))}
                                </Pie>
                            </PieChart>
                            <div className="space-y-1.5 flex-1 min-w-0">
                                {statusCounts.map((s) => (
                                    <div key={s.status} className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.status] ?? '#9ca3af' }} />
                                            <span className="text-xs text-gray-600 capitalize">{s.status}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-800">{s.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Plan distribution */}
                    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                        <SectionHeader icon={<Award className="h-4 w-4 text-blue-600" />} title="Plan Distribution" />
                        <div className="space-y-2">
                            {planCounts.slice(0, 5).map((p, i) => (
                                <div key={p.plan}>
                                    <div className="flex justify-between mb-0.5">
                                        <span className="text-xs text-gray-600 truncate max-w-[120px]">{p.plan}</span>
                                        <span className="text-xs font-semibold text-gray-800">{p.count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-gray-100">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${members.length > 0 ? (p.count / members.length) * 100 : 0}%`, background: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Tab 2: Attendance ────────────────────────────────────────────────────────

function AttendanceReport({ checkIns, members }: { checkIns: CheckInRow[]; members: MemberRow[] }) {
    // Daily check-ins last 30 days
    const dailyData = useMemo(() => {
        const days: { date: string; label: string }[] = []
        for (let i = 29; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            days.push({
                date: d.toISOString().split('T')[0],
                label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            })
        }
        const byDay: Record<string, number> = {}
        checkIns.forEach((c) => {
            const day = c.check_in_time.slice(0, 10)
            byDay[day] = (byDay[day] || 0) + 1
        })
        return days.map((d) => ({ day: d.label, 'Check-ins': byDay[d.date] || 0 }))
    }, [checkIns])

    // Peak hours
    const hourlyData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, Visits: 0 }))
        checkIns.forEach((c) => {
            const h = new Date(c.check_in_time).getHours()
            hours[h].Visits++
        })
        return hours.filter((h) => h.Visits > 0 || parseInt(h.hour) >= 5 && parseInt(h.hour) <= 22)
    }, [checkIns])

    // Top visitors
    const topVisitors = useMemo(() => {
        const counts: Record<string, number> = {}
        checkIns.forEach((c) => { counts[c.member_id] = (counts[c.member_id] || 0) + 1 })
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([id, count]) => {
                const m = members.find((mem) => mem.id === id)
                return { id, name: m?.full_name ?? 'Unknown', memberId: m?.member_id ?? '—', count }
            })
    }, [checkIns, members])

    const totalCheckIns = checkIns.length
    const uniqueVisitors = new Set(checkIns.map((c) => c.member_id)).size
    const peakHour = hourlyData.reduce((a, b) => (b.Visits > a.Visits ? b : a), { hour: '—', Visits: 0 })

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KPICard label="Check-ins (90 days)" value={totalCheckIns} color="green" />
                <KPICard label="Unique Visitors" value={uniqueVisitors} color="blue" />
                <KPICard label="Peak Hour" value={peakHour.hour} sub={`${peakHour.Visits} visits`} color="amber" />
            </div>

            {/* Daily check-in line chart */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <SectionHeader icon={<UserCheck className="h-4 w-4 text-emerald-600" />} title="Daily Check-ins" sub="Last 30 days" />
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="Check-ins" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Peak hours */}
                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <SectionHeader icon={<Clock className="h-4 w-4 text-amber-500" />} title="Peak Hours" sub="All time" />
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="Visits" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top visitors */}
                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <SectionHeader icon={<Award className="h-4 w-4 text-violet-600" />} title="Top 10 Visitors" sub="Last 90 days" />
                    {topVisitors.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">No check-in data yet</p>
                    ) : (
                        <div className="space-y-2">
                            {topVisitors.map((v, i) => (
                                <div key={v.id} className="flex items-center gap-2">
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800 truncate">{v.name}</p>
                                        <p className="text-[10px] text-gray-400">{v.memberId}</p>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600 shrink-0">{v.count} visits</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Tab 3: Renewals ──────────────────────────────────────────────────────────

function RenewalsReport({ members }: { members: MemberRow[] }) {
    const [window, setWindow] = useState<7 | 15 | 30>(15)

    const expiring = useMemo(() => {
        const now = new Date()
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + window)
        return members.filter((m) => {
            if (!m.membership_expiry_date) return false
            const exp = new Date(m.membership_expiry_date)
            return exp >= now && exp <= cutoff && m.status === 'active'
        }).sort((a, b) => new Date(a.membership_expiry_date!).getTime() - new Date(b.membership_expiry_date!).getTime())
    }, [members, window])

    const alreadyExpired = useMemo(
        () => members.filter((m) => m.status === 'expired').length,
        [members]
    )

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KPICard label="Expiring in 7 days" value={members.filter((m) => {
                    if (!m.membership_expiry_date || m.status !== 'active') return false
                    const diff = (new Date(m.membership_expiry_date).getTime() - Date.now()) / 86400000
                    return diff >= 0 && diff <= 7
                }).length} color="red" />
                <KPICard label="Expiring in 30 days" value={members.filter((m) => {
                    if (!m.membership_expiry_date || m.status !== 'active') return false
                    const diff = (new Date(m.membership_expiry_date).getTime() - Date.now()) / 86400000
                    return diff >= 0 && diff <= 30
                }).length} color="amber" />
                <KPICard label="Already Expired" value={alreadyExpired} color="red" />
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <SectionHeader icon={<AlertCircle className="h-4 w-4 text-rose-600" />} title="Members Expiring Soon" />
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                        {([7, 15, 30] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setWindow(d)}
                                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${window === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {d} days
                            </button>
                        ))}
                    </div>
                </div>

                {expiring.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-10">No expiries in the next {window} days 🎉</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Member</th>
                                    <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan</th>
                                    <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Expiry</div>
                                    </th>
                                    <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Days Left</th>
                                    <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                        <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expiring.map((m) => {
                                    const daysLeft = Math.ceil((new Date(m.membership_expiry_date!).getTime() - Date.now()) / 86400000)
                                    return (
                                        <tr key={m.id} className="hover:bg-rose-50/20 transition-colors">
                                            <td className="py-2.5">
                                                <p className="text-sm font-medium text-gray-800">{m.full_name}</p>
                                                <p className="text-[10px] text-gray-400">{m.member_id}</p>
                                            </td>
                                            <td className="py-2.5 text-xs text-gray-500">{m.membership_plan?.name ?? '—'}</td>
                                            <td className="py-2.5 text-xs text-gray-600">{formatDate(m.membership_expiry_date!)}</td>
                                            <td className="py-2.5">
                                                <span className={`text-xs font-bold ${daysLeft <= 7 ? 'text-rose-600' : daysLeft <= 15 ? 'text-amber-600' : 'text-yellow-600'}`}>
                                                    {daysLeft}d
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-xs text-gray-600">{m.phone}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <p className="mt-3 text-xs text-gray-400">{expiring.length} member{expiring.length !== 1 ? 's' : ''} expiring within {window} days</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Tab 4: Payments ─────────────────────────────────────────────────────────

function PaymentsReport({ payments }: { payments: PaymentRow[] }) {
    const paidPayments = payments.filter((p) => p.payment_status === 'paid')
    const pendingPayments = payments.filter((p) => p.payment_status === 'pending')
    const totalRevenue = paidPayments.reduce((s, p) => s + Number(p.amount), 0)

    // Method breakdown
    const methodData = useMemo(() => {
        const counts: Record<string, { count: number; total: number }> = {}
        paidPayments.forEach((p) => {
            if (!counts[p.payment_method]) counts[p.payment_method] = { count: 0, total: 0 }
            counts[p.payment_method].count++
            counts[p.payment_method].total += Number(p.amount)
        })
        return Object.entries(counts)
            .map(([method, data]) => ({
                method,
                ...data,
                cfg: METHOD_CONFIG[method] ?? { label: method, icon: <Wallet className="h-3.5 w-3.5" />, color: '#9ca3af' },
            }))
            .sort((a, b) => b.total - a.total)
    }, [paidPayments])

    // Monthly revenue (12 months)
    const monthlyRevenue = useMemo(() => {
        const months: { key: string; label: string }[] = []
        for (let i = 11; i >= 0; i--) {
            const d = new Date()
            d.setDate(1)
            d.setMonth(d.getMonth() - i)
            months.push({
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            })
        }
        const byMonth: Record<string, number> = {}
        paidPayments.forEach((p) => {
            const key = p.payment_date.slice(0, 7)
            byMonth[key] = (byMonth[key] || 0) + Number(p.amount)
        })
        return months.map((m) => ({ month: m.label, Revenue: Math.round(byMonth[m.key] || 0) }))
    }, [paidPayments])

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KPICard label="Total Revenue" value={formatCurrency(totalRevenue)} color="green" />
                <KPICard label="Total Payments" value={paidPayments.length} color="blue" />
                <KPICard label="Pending" value={pendingPayments.length} color="amber" sub={formatCurrency(pendingPayments.reduce((s, p) => s + Number(p.amount), 0))} />
                <KPICard label="Avg. Payment" value={formatCurrency(paidPayments.length > 0 ? totalRevenue / paidPayments.length : 0)} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Monthly revenue chart */}
                <div className="lg:col-span-2 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <SectionHeader icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} title="Monthly Revenue" sub="Last 12 months" />
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={44} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Method breakdown */}
                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <SectionHeader icon={<CreditCard className="h-4 w-4 text-blue-600" />} title="Payment Methods" />
                    {methodData.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">No payment data</p>
                    ) : (
                        <div className="space-y-3">
                            {methodData.map((m) => (
                                <div key={m.method}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="flex items-center gap-1 text-xs text-gray-600" style={{ color: m.cfg.color }}>
                                            {m.cfg.icon} {m.cfg.label}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-700">{formatCurrency(m.total)}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-gray-100">
                                        <div className="h-full rounded-full" style={{ width: `${totalRevenue > 0 ? (m.total / totalRevenue) * 100 : 0}%`, background: m.cfg.color }} />
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-right mt-0.5">{m.count} payments</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Pending payments list */}
            {pendingPayments.length > 0 && (
                <div className="rounded-xl bg-white p-5 shadow-sm border border-amber-100">
                    <SectionHeader icon={<AlertCircle className="h-4 w-4 text-amber-500" />} title="Pending / Unpaid" sub={`${pendingPayments.length} payment${pendingPayments.length !== 1 ? 's' : ''} pending`} />
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Member</th>
                                    <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
                                    <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Amount</th>
                                    <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Phone</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pendingPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                                        <td className="py-2.5">
                                            <p className="text-sm font-medium text-gray-800">{p.member?.full_name ?? '—'}</p>
                                            <p className="text-[10px] text-gray-400">{p.member?.member_id ?? '—'}</p>
                                        </td>
                                        <td className="py-2.5 text-xs text-gray-500">{formatDate(p.payment_date)}</td>
                                        <td className="py-2.5 text-right text-sm font-bold text-amber-600">{formatCurrency(Number(p.amount))}</td>
                                        <td className="py-2.5 text-xs text-gray-600">{p.member?.phone ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReportsDashboard({ members, checkIns, payments }: ReportsDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabId>('membership')

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
                <p className="text-sm text-gray-500 mt-0.5">Analytics across membership, attendance & finances</p>
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto">
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit min-w-max">
                    {TABS.map((tab) => {
                        const Icon = tab.icon
                        const active = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Icon className={`h-3.5 w-3.5 ${active ? 'text-blue-600' : ''}`} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab content */}
            {activeTab === 'membership' && <MembershipReport members={members} />}
            {activeTab === 'attendance' && <AttendanceReport checkIns={checkIns} members={members} />}
            {activeTab === 'renewals' && <RenewalsReport members={members} />}
            {activeTab === 'payments' && <PaymentsReport payments={payments} />}
        </div>
    )
}


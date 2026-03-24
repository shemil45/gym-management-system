'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import {
    UserCheck,
    Receipt,
    Gift,
    User,
    CalendarDays,
    Clock,
    CreditCard,
    Flame,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    PauseCircle,
    XCircle,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface MemberData {
    member_id: string
    full_name: string
    photo_url: string | null
    membership_plan: { name: string; price: number; duration_days: number } | null
    membership_start_date: string | null
    membership_expiry_date: string | null
    status: 'active' | 'inactive' | 'frozen' | 'expired'
    // stats
    totalVisitsThisMonth: number
    totalVisitsAllTime: number
    lastCheckIn: string | null
    currentStreak: number
    // payments
    lastPayment: { amount: number; payment_date: string } | null
}

function getDaysRemaining(expiryDate: string | null) {
    if (!expiryDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusConfig(status: string, daysRemaining: number | null) {
    if (status === 'frozen') return { label: 'Frozen', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: PauseCircle, dot: 'bg-blue-500' }
    if (status === 'expired' || (daysRemaining !== null && daysRemaining < 0)) return { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, dot: 'bg-red-500' }
    if (daysRemaining !== null && daysRemaining <= 7) return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, dot: 'bg-amber-500' }
    if (status === 'active') return { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-500' }
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle, dot: 'bg-gray-400' }
}

function formatLastCheckIn(dateStr: string | null) {
    if (!dateStr) return 'No visits yet'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `Today at ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
}

export default function MemberDashboard() {
    const [memberData, setMemberData] = useState<MemberData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: member } = await supabase
                .from('members')
                .select('*, membership_plan:membership_plans(name, price, duration_days)')
                .eq('user_id', user.id)
                .single() as { data: {
                    member_id: string
                    full_name: string
                    photo_url: string | null
                    status: 'active' | 'inactive' | 'frozen' | 'expired'
                    membership_start_date: string | null
                    membership_expiry_date: string | null
                    membership_plan: { name: string; price: number; duration_days: number } | null
                } | null, error: unknown }

            if (!member) { setLoading(false); return }

            const now = new Date()
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

            const [
                { count: totalVisitsThisMonth },
                { count: totalVisitsAllTime },
                { data: recentCheckIns },
                { data: lastPaymentData },
            ] = await Promise.all([
                supabase.from('check_ins').select('*', { count: 'exact', head: true })
                    .eq('member_id', member.member_id).gte('check_in_time', monthStart),
                supabase.from('check_ins').select('*', { count: 'exact', head: true })
                    .eq('member_id', member.member_id),
                supabase.from('check_ins').select('*')
                    .eq('member_id', member.member_id)
                    .order('check_in_time', { ascending: false })
                    .limit(60) as unknown as Promise<{ data: { check_in_time: string }[] | null }>,
                supabase.from('payments').select('*')
                    .eq('member_id', member.member_id)
                    .eq('payment_status', 'paid')
                    .order('payment_date', { ascending: false })
                    .limit(1) as unknown as Promise<{ data: { amount: number; payment_date: string }[] | null }>,
            ])

            // Calculate streak
            let streak = 0
            const checkInItems = recentCheckIns as { check_in_time: string }[] | null
            if (checkInItems && checkInItems.length > 0) {
                const dates = [...new Set(checkInItems.map(c =>
                    new Date(c.check_in_time).toISOString().split('T')[0]
                ))].sort().reverse()
                const today = new Date().toISOString().split('T')[0]
                if (dates[0] === today || dates[0] === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
                    for (let i = 0; i < dates.length - 1; i++) {
                        const d1 = new Date(dates[i])
                        const d2 = new Date(dates[i + 1])
                        const diff = (d1.getTime() - d2.getTime()) / 86400000
                        if (diff <= 1) streak++
                        else break
                    }
                    streak += 1
                }
            }

            const paymentItems = lastPaymentData as { amount: number; payment_date: string }[] | null
            setMemberData({
                member_id: member.member_id,
                full_name: member.full_name,
                photo_url: member.photo_url,
                membership_plan: member.membership_plan,
                membership_start_date: member.membership_start_date,
                membership_expiry_date: member.membership_expiry_date,
                status: member.status,
                totalVisitsThisMonth: totalVisitsThisMonth || 0,
                totalVisitsAllTime: totalVisitsAllTime || 0,
                lastCheckIn: checkInItems?.[0]?.check_in_time || null,
                currentStreak: streak,
                lastPayment: paymentItems?.[0] || null,
            })
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-52 bg-gray-200 rounded-2xl" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-24 bg-gray-200 rounded-xl" />
                    <div className="h-24 bg-gray-200 rounded-xl" />
                </div>
                <div className="h-28 bg-gray-200 rounded-xl" />
            </div>
        )
    }

    if (!memberData) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
                <h2 className="text-lg font-semibold text-gray-700">Member Profile Not Found</h2>
                <p className="text-sm text-gray-500 mt-1">Your account isn't linked to a member record yet. Please contact the gym admin.</p>
            </div>
        )
    }

    const daysRemaining = getDaysRemaining(memberData.membership_expiry_date)
    const statusConfig = getStatusConfig(memberData.status, daysRemaining)
    const StatusIcon = statusConfig.icon

    // Progress bar: days used / total plan days
    let progressPct = 0
    if (memberData.membership_plan && memberData.membership_start_date && memberData.membership_expiry_date) {
        const total = memberData.membership_plan.duration_days
        const start = new Date(memberData.membership_start_date)
        const now = new Date()
        const used = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86400000))
        progressPct = Math.min(100, Math.round((used / total) * 100))
    }

    const initials = memberData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    return (
        <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Welcome back 👋</h1>
                <p className="text-sm text-gray-500 mt-0.5">Here's your membership overview</p>
            </div>

            {/* ── Digital Membership Card ── */}
            <div
                className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}
            >
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-500/10" />

                <div className="relative flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-16 w-16 border-2 border-white/20 shadow-lg shrink-0">
                        <AvatarImage src={memberData.photo_url || undefined} alt={memberData.full_name} />
                        <AvatarFallback className="bg-emerald-500 text-white text-lg font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-[11px] text-white/60 font-medium">MEMBER ID</p>
                                <p className="text-lg font-bold font-mono tracking-wider leading-tight">{memberData.member_id}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusConfig.color}`}>
                                <div className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                                {statusConfig.label}
                            </div>
                        </div>
                        <p className="text-base font-semibold mt-1 truncate">{memberData.full_name}</p>
                        <p className="text-xs text-white/60 mt-0.5">{memberData.membership_plan?.name || 'No active plan'}</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-white/10" />

                {/* Dates + Progress */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">
                            {memberData.membership_start_date ? formatDate(memberData.membership_start_date) : '—'}
                        </span>
                        <span className="font-semibold text-white/90">
                            {daysRemaining !== null && daysRemaining > 0
                                ? `${daysRemaining} days remaining`
                                : daysRemaining === 0
                                    ? 'Expires today!'
                                    : 'Expired'}
                        </span>
                        <span className="text-white/60">
                            {memberData.membership_expiry_date ? formatDate(memberData.membership_expiry_date) : '—'}
                        </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10">
                        <div
                            className="h-1.5 rounded-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-white/40 text-center">Show this card to staff at entrance</p>
                </div>
            </div>

            {/* ── This Month's Stats ── */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 mx-auto mb-2">
                        <CalendarDays className="h-4 w-4 text-violet-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{memberData.totalVisitsThisMonth}</p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Visits This<br />Month</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 mx-auto mb-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{memberData.currentStreak}</p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Day<br />Streak 🔥</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 mx-auto mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 leading-tight">{formatLastCheckIn(memberData.lastCheckIn)}</p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Last<br />Check-in</p>
                </div>
            </div>

            {/* ── Next Payment Reminder ── */}
            {(daysRemaining !== null && daysRemaining <= 30) || memberData.status === 'expired' ? (
                <div className={`rounded-xl p-4 border flex items-center gap-4 ${memberData.status === 'expired' || (daysRemaining !== null && daysRemaining < 0)
                    ? 'bg-red-50 border-red-200'
                    : daysRemaining !== null && daysRemaining <= 7
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${memberData.status === 'expired' ? 'bg-red-100' : daysRemaining !== null && daysRemaining <= 7 ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        <CreditCard className={`h-5 w-5 ${memberData.status === 'expired' ? 'text-red-600' : daysRemaining !== null && daysRemaining <= 7 ? 'text-amber-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                            {memberData.status === 'expired' ? 'Membership Expired' : `Renewal Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {memberData.membership_plan
                                ? `${memberData.membership_plan.name} — ${formatCurrency(memberData.membership_plan.price)}`
                                : 'Contact the gym to renew'}
                        </p>
                    </div>
                    <Link
                        href="/member/payments"
                        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${memberData.status === 'expired'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : daysRemaining !== null && daysRemaining <= 7
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        View
                    </Link>
                </div>
            ) : null}

            {/* ── Quick Actions ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { href: '/member/check-ins', icon: UserCheck, label: 'Check-ins', color: 'bg-violet-500', shadow: 'shadow-violet-500/30' },
                        { href: '/member/payments', icon: Receipt, label: 'Payments', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/30' },
                        { href: '/member/referrals', icon: Gift, label: 'Referrals', color: 'bg-orange-500', shadow: 'shadow-orange-500/30' },
                        { href: '/member/profile', icon: User, label: 'Profile', color: 'bg-blue-600', shadow: 'shadow-blue-600/30' },
                    ].map(({ href, icon: Icon, label, color, shadow }) => (
                        <Link key={href} href={href} className="group flex flex-col items-center gap-2">
                            <div className={`flex h-13 w-13 h-12 w-12 items-center justify-center rounded-xl ${color} text-white shadow-md ${shadow} group-hover:opacity-90 transition-opacity`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── All-time stats ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">My Stats</h2>
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Total Visits (All Time)</span>
                        <span className="text-xs font-semibold text-gray-800">{memberData.totalVisitsAllTime.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Visits This Month</span>
                        <span className="text-xs font-semibold text-gray-800">{memberData.totalVisitsThisMonth}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Current Streak</span>
                        <span className="text-xs font-semibold text-gray-800">{memberData.currentStreak} {memberData.currentStreak > 0 ? '🔥' : ''}</span>
                    </div>
                    {memberData.lastPayment && (
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 mt-2.5">
                            <span className="text-xs text-gray-500">Last Payment</span>
                            <span className="text-xs font-semibold text-gray-800">
                                {formatCurrency(memberData.lastPayment.amount)} · {formatDate(memberData.lastPayment.payment_date)}
                            </span>
                        </div>
                    )}
                </div>
                <Link href="/member/check-ins" className="mt-4 flex items-center justify-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                    View full check-in history <ChevronRight className="h-3 w-3" />
                </Link>
            </div>
        </div>
    )
}

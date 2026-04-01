'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import {
    CalendarDays,
    Clock,
    CreditCard,
    Flame,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    PauseCircle,
    XCircle,
    MessageSquare,
    Zap,
    Salad,
    ArrowRight,
    Dumbbell,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient'

interface MemberData {
    member_id: string
    full_name: string
    photo_url: string | null
    membership_plan: { name: string; price: number; duration_days: number } | null
    membership_start_date: string | null
    membership_expiry_date: string | null
    status: 'active' | 'inactive' | 'frozen' | 'expired'
    totalVisitsThisMonth: number
    totalVisitsAllTime: number
    lastCheckIn: string | null
    currentStreak: number
    lastPayment: { amount: number; payment_date: string } | null
    onboardingDone: Record<string, boolean>
}

interface MemberQueryRow {
    id: string
    member_id: string
    full_name: string
    photo_url: string | null
    membership_plan: { name: string; price: number; duration_days: number } | null
    membership_start_date: string | null
    membership_expiry_date: string | null
    status: 'active' | 'inactive' | 'frozen' | 'expired'
}

interface CheckInTimeRow {
    check_in_time: string
}

interface LastPaymentRow {
    amount: number
    payment_date: string
}

function getDaysRemaining(expiryDate: string | null) {
    if (!expiryDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0)
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusConfig(status: string, daysRemaining: number | null) {
    if (status === 'frozen') return { label: 'Frozen', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: PauseCircle }
    if (status === 'expired' || (daysRemaining !== null && daysRemaining < 0)) return { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', icon: XCircle }
    if (daysRemaining !== null && daysRemaining <= 7) return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: AlertCircle }
    if (status === 'active') return { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 }
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400', icon: XCircle }
}

function formatLastCheckIn(dateStr: string | null, now: Date) {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `Today at ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
}

// Onboarding steps
const ONBOARDING_STEPS = [
    { key: 'profile', label: 'Complete your profile', href: '/member/profile' },
    { key: 'workout', label: 'Generate your first workout plan', href: '/member/workout' },
    { key: 'nutrition', label: 'Set your nutrition goal', href: '/member/nutrition' },
    { key: 'checkin', label: 'Do your first check-in', href: '/member/check-ins' },
]

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
                .single() as { data: MemberQueryRow | null, error: unknown }

            if (!member) { setLoading(false); return }

            const now = new Date()
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

            const [
                { count: totalVisitsThisMonth },
                { count: totalVisitsAllTime },
                { data: recentCheckIns },
                { data: lastPaymentData },
                { count: fitnessProfileCount },
                { count: workoutPlanCount },
                { count: nutritionPlanCount },
            ] = await Promise.all([
                supabase.from('check_ins').select('*', { count: 'exact', head: true }).eq('member_id', member.id).gte('check_in_time', monthStart),
                supabase.from('check_ins').select('*', { count: 'exact', head: true }).eq('member_id', member.id),
                supabase.from('check_ins').select('check_in_time').eq('member_id', member.id).order('check_in_time', { ascending: false }).limit(60) as { data: CheckInTimeRow[] | null, error: unknown },
                supabase.from('payments').select('amount, payment_date').eq('member_id', member.id).eq('payment_status', 'paid').order('payment_date', { ascending: false }).limit(1) as { data: LastPaymentRow[] | null, error: unknown },
                supabase.from('fitness_profiles').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('workout_plans').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('nutrition_plans').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            ])

            let streak = 0
            if (recentCheckIns?.length > 0) {
                const dates = [...new Set(recentCheckIns.map((c) => new Date(c.check_in_time).toISOString().split('T')[0]))].sort().reverse()
                const today = new Date().toISOString().split('T')[0]
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                if (dates[0] === today || dates[0] === yesterday.toISOString().split('T')[0]) {
                    for (let i = 0; i < dates.length - 1; i++) {
                        const diff = (new Date(dates[i]).getTime() - new Date(dates[i + 1]).getTime()) / 86400000
                        if (diff <= 1) streak++
                        else break
                    }
                    streak += 1
                }
            }

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
                lastCheckIn: recentCheckIns?.[0]?.check_in_time || null,
                currentStreak: streak,
                lastPayment: lastPaymentData?.[0] || null,
                onboardingDone: {
                    profile: (fitnessProfileCount || 0) > 0,
                    workout: (workoutPlanCount || 0) > 0,
                    nutrition: (nutritionPlanCount || 0) > 0,
                    checkin: (totalVisitsAllTime || 0) > 0,
                },
            })
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-gray-200 rounded-xl" />
                <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
                </div>
                <div className="h-32 bg-gray-200 rounded-xl" />
                <div className="h-40 bg-gray-200 rounded-xl" />
            </div>
        )
    }

    if (!memberData) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
                <h2 className="text-lg font-semibold text-gray-700">Member Profile Not Found</h2>
                <p className="text-sm text-gray-500 mt-1">Your account isn&apos;t linked to a member record yet. Please contact the gym admin.</p>
            </div>
        )
    }

    const daysRemaining = getDaysRemaining(memberData.membership_expiry_date)
    const statusConfig = getStatusConfig(memberData.status, daysRemaining)
    const initials = memberData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    // progress bar
    let progressPct = 0
    if (memberData.membership_plan && memberData.membership_start_date && memberData.membership_expiry_date) {
        const now = new Date()
        const used = Math.max(0, Math.ceil((now.getTime() - new Date(memberData.membership_start_date).getTime()) / 86400000))
        progressPct = Math.min(100, Math.round((used / memberData.membership_plan.duration_days) * 100))
    }

    const onboardingDone = memberData.onboardingDone
    const onboardingPct = Math.round((Object.values(onboardingDone).filter(Boolean).length / ONBOARDING_STEPS.length) * 100)
    const showOnboardingChecklist = onboardingPct < 100

    return (
        <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Welcome back 👋</h1>
                <p className="text-sm text-gray-500 mt-0.5">Here&apos;s your membership overview</p>
            </div>

            {/* ── COMPACT Identity Strip ── */}
            <div
                className="relative overflow-hidden rounded-xl px-4 py-3 text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}
            >
                {/* Decorative blur */}
                <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl" />

                <div className="relative flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white/20 shrink-0">
                        <AvatarImage src={memberData.photo_url || undefined} alt={memberData.full_name} />
                        <AvatarFallback className="bg-emerald-500 text-white text-sm font-bold">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-bold truncate leading-tight">{memberData.full_name}</p>
                                <p className="text-[11px] text-white/50 font-mono">{memberData.member_id}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${statusConfig.color}`}>
                                <div className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                                {statusConfig.label}
                            </div>
                        </div>

                        {/* Mini progress bar */}
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-white/10">
                                <div className="h-1 rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-[10px] text-white/50 shrink-0">
                                {memberData.membership_plan?.name || 'No plan'}
                                {daysRemaining !== null && daysRemaining > 0 ? ` · ${daysRemaining}d left` : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Onboarding Checklist (new members only) ── */}
            {showOnboardingChecklist && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm font-bold text-blue-900">Get started — {onboardingPct}% complete</h2>
                            <p className="text-xs text-blue-600 mt-0.5">Complete these steps to unlock all features</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-extrabold text-blue-700">{onboardingPct}%</span>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-blue-200 mb-3">
                        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${onboardingPct}%` }} />
                    </div>
                    <ul className="space-y-2">
                        {ONBOARDING_STEPS.map(step => (
                            <li key={step.key}>
                                <Link href={step.href} className="flex items-center gap-2.5 group">
                                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${onboardingDone[step.key] ? 'bg-blue-500 border-blue-500' : 'border-blue-300 group-hover:border-blue-500'}`}>
                                        {onboardingDone[step.key] && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                    <span className={`text-xs ${onboardingDone[step.key] ? 'text-blue-400 line-through' : 'text-blue-800 group-hover:text-blue-600'}`}>{step.label}</span>
                                    {!onboardingDone[step.key] && <ArrowRight className="h-3 w-3 text-blue-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Renewal banner ── */}
            {((daysRemaining !== null && daysRemaining <= 30) || memberData.status === 'expired') && (
                <div className={`rounded-xl p-4 border flex items-center gap-4 ${
                    memberData.status === 'expired' || (daysRemaining !== null && daysRemaining < 0) ? 'bg-red-50 border-red-200'
                    : daysRemaining !== null && daysRemaining <= 7 ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                    <CreditCard className={`h-5 w-5 shrink-0 ${memberData.status === 'expired' ? 'text-red-500' : daysRemaining !== null && daysRemaining <= 7 ? 'text-amber-500' : 'text-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                            {memberData.status === 'expired' ? 'Membership Expired' : `Renewal due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {memberData.membership_plan ? `${memberData.membership_plan.name} — ${formatCurrency(memberData.membership_plan.price)}` : 'Contact gym to renew'}
                        </p>
                    </div>
                    <Link href="/member/plans" className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        memberData.status === 'expired' ? 'bg-red-600 text-white hover:bg-red-700'
                        : daysRemaining !== null && daysRemaining <= 7 ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                        Renew
                    </Link>
                </div>
            )}

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-3 gap-3">
                {/* Visits this month */}
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 mx-auto mb-2">
                        <CalendarDays className="h-4 w-4 text-violet-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{memberData.totalVisitsThisMonth}</p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Visits<br />This Month</p>
                    {memberData.totalVisitsThisMonth === 0 && (
                        <p className="text-[10px] text-violet-500 mt-1.5 leading-tight">Start today 💪</p>
                    )}
                </div>

                {/* Streak */}
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 mx-auto mb-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{memberData.currentStreak}</p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Day<br />Streak 🔥</p>
                    {memberData.currentStreak === 0 && (
                        <p className="text-[10px] text-orange-400 mt-1.5 leading-tight">Build one!</p>
                    )}
                </div>

                {/* Last check-in */}
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 mx-auto mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    {memberData.lastCheckIn ? (
                        <p className="text-sm font-bold text-gray-900 leading-tight">{formatLastCheckIn(memberData.lastCheckIn, new Date())}</p>
                    ) : (
                        <p className="text-sm font-bold text-gray-400 leading-tight">No visits<br />yet</p>
                    )}
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Last<br />Check-in</p>
                </div>
            </div>

            {/* ── AI Quick Actions (replaces old sidebar duplicate buttons) ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-blue-500">
                        <Zap className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-900">AI Features</h2>
                    <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Powered by Gemini</span>
                </div>
                <div className="space-y-3">
                    <Link href="/member/ai-trainer" className="block">
                        <HoverBorderGradient
                            duration={1.8}
                            containerClassName="group w-full rounded-2xl border-0 bg-transparent p-[1px] transition-transform duration-200 hover:-translate-y-0.5"
                            className="flex min-h-28 w-full flex-col items-center justify-center gap-4 rounded-2xl bg-white px-4 py-5 text-center shadow-sm"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-md shadow-violet-500/25 transition-transform group-hover:scale-105">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">Ask AI Trainer</p>
                                <p className="text-xs text-gray-400 leading-relaxed">Chat with your personal AI coach</p>
                            </div>
                        </HoverBorderGradient>
                    </Link>

                    <div className="grid grid-cols-2 items-stretch gap-3">
                        {[
                            { href: '/member/workout', icon: Dumbbell, label: 'Generate Workout', desc: 'AI-tailored weekly plan', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/25' },
                            { href: '/member/nutrition', icon: Salad, label: 'Meal Plan', desc: '7-day nutrition planner', color: 'bg-orange-500', shadow: 'shadow-orange-500/25' },
                        ].map(({ href, icon: Icon, label, desc, color, shadow }) => (
                            <Link key={href} href={href} className="block h-full">
                                <HoverBorderGradient
                                    duration={1.8}
                                    containerClassName="group h-full w-full rounded-2xl border-0 bg-transparent p-[1px] transition-transform duration-200 hover:-translate-y-0.5"
                                    className="flex h-full min-h-28 w-full flex-col items-center justify-center gap-4 rounded-2xl bg-white px-4 py-5 text-center shadow-sm"
                                >
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${color} text-white shadow-md ${shadow} transition-transform group-hover:scale-105`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="grid min-h-[5.75rem] w-full grid-rows-[2.75rem_1fr] justify-items-center">
                                        <p className="flex min-h-[2.75rem] items-center justify-center text-sm font-semibold leading-tight text-gray-900">
                                            {label}
                                        </p>
                                        <p className="flex min-h-[3rem] items-start justify-center text-xs leading-relaxed text-gray-400">
                                            {desc}
                                        </p>
                                    </div>
                                </HoverBorderGradient>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── My Stats ── */}
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

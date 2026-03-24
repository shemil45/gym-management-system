'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Flame, Trophy, Activity } from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface CheckIn {
    id: string
    check_in_time: string
    check_out_time: string | null
    entry_method: string
}

function getDuration(checkIn: string, checkOut: string | null) {
    if (!checkOut) return '—'
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true
    })
}

function formatDateLabel(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short'
    })
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

export default function MemberCheckIns() {
    const [checkIns, setCheckIns] = useState<CheckIn[]>([])
    const [memberId, setMemberId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [calMonth, setCalMonth] = useState(() => {
        const now = new Date()
        return { year: now.getFullYear(), month: now.getMonth() }
    })
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 10

    useEffect(() => {
        async function fetchCheckIns() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: member } = await supabase
                .from('members').select('*').eq('user_id', user.id).single() as {
                    data: { member_id: string } | null, error: unknown
                }
            if (!member) { setLoading(false); return }

            setMemberId(member.member_id)

            const { data } = await supabase
                .from('check_ins')
                .select('*')
                .eq('member_id', member.member_id)
                .order('check_in_time', { ascending: false })

            setCheckIns((data as CheckIn[]) || [])
            setLoading(false)
        }
        fetchCheckIns()
    }, [])

    // Derive stats
    const stats = useMemo(() => {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const yearStart = new Date(now.getFullYear(), 0, 1)

        const thisMonth = checkIns.filter(c => new Date(c.check_in_time) >= monthStart).length
        const thisYear = checkIns.filter(c => new Date(c.check_in_time) >= yearStart).length
        const total = checkIns.length

        // Streak calculation
        const dates = [...new Set(checkIns.map(c =>
            new Date(c.check_in_time).toISOString().split('T')[0]
        ))].sort().reverse()

        let currentStreak = 0
        let longestStreak = 0
        let tempStreak = 1

        const todayStr = now.toISOString().split('T')[0]
        const yestStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (dates.length > 0 && (dates[0] === todayStr || dates[0] === yestStr)) {
            currentStreak = 1
            for (let i = 0; i < dates.length - 1; i++) {
                const d1 = new Date(dates[i])
                const d2 = new Date(dates[i + 1])
                if ((d1.getTime() - d2.getTime()) / 86400000 <= 1) currentStreak++
                else break
            }
        }

        for (let i = 0; i < dates.length - 1; i++) {
            const d1 = new Date(dates[i])
            const d2 = new Date(dates[i + 1])
            if ((d1.getTime() - d2.getTime()) / 86400000 <= 1) tempStreak++
            else tempStreak = 1
            if (tempStreak > longestStreak) longestStreak = tempStreak
        }
        if (dates.length === 1) longestStreak = 1

        // Avg per week (based on weeks since first check-in)
        let avgPerWeek = 0
        if (dates.length > 0) {
            const firstDate = new Date(dates[dates.length - 1])
            const weeks = Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / (7 * 86400000)))
            avgPerWeek = parseFloat((total / weeks).toFixed(1))
        }

        return { thisMonth, thisYear, total, currentStreak, longestStreak, avgPerWeek }
    }, [checkIns])

    // Calendar: set of dates with check-ins for the displayed month
    const calendarCheckInDates = useMemo(() => {
        return new Set(
            checkIns
                .filter(c => {
                    const d = new Date(c.check_in_time)
                    return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month
                })
                .map(c => new Date(c.check_in_time).getDate())
        )
    }, [checkIns, calMonth])

    // Calendar days
    const calDays = useMemo(() => {
        const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay()
        const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate()
        const cells: (number | null)[] = Array(firstDay).fill(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)
        return cells
    }, [calMonth])

    // Weekly bar chart data
    const weeklyData = useMemo(() => {
        const counts = [0, 0, 0, 0, 0, 0, 0]
        checkIns.forEach(c => counts[new Date(c.check_in_time).getDay()]++)
        return DAY_NAMES.map((d, i) => ({ day: d, visits: counts[i] }))
    }, [checkIns])

    const paged = checkIns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const totalPages = Math.ceil(checkIns.length / PAGE_SIZE)
    const today = new Date()

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}</div>
                <div className="h-64 bg-gray-200 rounded-xl" />
                <div className="h-48 bg-gray-200 rounded-xl" />
            </div>
        )
    }

    return (
        <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Check-in History</h1>
                <p className="text-sm text-gray-500 mt-0.5">Your attendance record</p>
            </div>

            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'This Month', value: stats.thisMonth, icon: CalendarDays, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'This Year', value: stats.thisYear, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'All Time', value: stats.total, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Current Streak', value: `${stats.currentStreak}d`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
                    { label: 'Longest Streak', value: `${stats.longestStreak}d`, icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'Avg / Week', value: stats.avgPerWeek, icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg} mb-1.5`}>
                            <Icon className={`h-3.5 w-3.5 ${color}`} />
                        </div>
                        <p className="text-xl font-bold text-gray-900">{value}</p>
                        <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* ── Calendar View ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">
                        {MONTH_NAMES[calMonth.month]} {calMonth.year}
                    </h2>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCalMonth(prev => {
                                const d = new Date(prev.year, prev.month - 1, 1)
                                return { year: d.getFullYear(), month: d.getMonth() }
                            })}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setCalMonth({ year: today.getFullYear(), month: today.getMonth() })}
                            className="px-2 h-7 rounded-lg text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setCalMonth(prev => {
                                const d = new Date(prev.year, prev.month + 1, 1)
                                return { year: d.getFullYear(), month: d.getMonth() }
                            })}
                            disabled={calMonth.year === today.getFullYear() && calMonth.month === today.getMonth()}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                    {DAY_NAMES.map(d => (
                        <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
                    ))}
                </div>

                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-1">
                    {calDays.map((day, i) => {
                        const isToday = day === today.getDate() && calMonth.month === today.getMonth() && calMonth.year === today.getFullYear()
                        const hasCheckIn = day !== null && calendarCheckInDates.has(day)
                        return (
                            <div
                                key={i}
                                className={`relative flex flex-col items-center justify-center rounded-lg aspect-square text-xs font-medium transition-colors
                                    ${day === null ? '' : isToday ? 'bg-emerald-500 text-white' : hasCheckIn ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}
                                `}
                            >
                                {day}
                                {hasCheckIn && !isToday && (
                                    <div className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-emerald-50 border border-emerald-200" /> Visited
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-emerald-500" /> Today
                    </div>
                </div>
            </div>

            {/* ── Weekly Bar Chart ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">Visits by Day of Week</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Your most frequent workout days</p>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            formatter={(val: number | undefined) => [`${val ?? 0} visit${val !== 1 ? 's' : ''}`, '' as string] as [string, string]}
                        />
                        <Bar dataKey="visits" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* ── List View ── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">All Check-ins</h2>
                    <span className="text-xs text-gray-400">{checkIns.length} total</span>
                </div>

                {checkIns.length === 0 ? (
                    <div className="py-12 text-center">
                        <Clock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No check-ins yet</p>
                        <p className="text-xs text-gray-300 mt-1">Your visits will appear here</p>
                    </div>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="grid grid-cols-4 gap-2 px-2 mb-2">
                            {['Date', 'Check-in', 'Check-out', 'Duration'].map(h => (
                                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</span>
                            ))}
                        </div>
                        <div className="space-y-1">
                            {paged.map(c => (
                                <div key={c.id} className="grid grid-cols-4 gap-2 items-center rounded-lg px-2 py-2.5 hover:bg-gray-50 transition-colors">
                                    <span className="text-xs font-medium text-gray-800">{formatDateLabel(c.check_in_time)}</span>
                                    <span className="text-xs text-gray-500">{formatTime(c.check_in_time)}</span>
                                    <span className="text-xs text-gray-500">{c.check_out_time ? formatTime(c.check_out_time) : '—'}</span>
                                    <span className="text-xs text-gray-500">{getDuration(c.check_in_time, c.check_out_time)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                                </button>
                                <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page === totalPages - 1}
                                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
                                >
                                    Next <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

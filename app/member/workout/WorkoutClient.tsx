'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Zap, RefreshCw, Dumbbell } from 'lucide-react'
import { generateWorkoutPlan } from './actions'
import { Button } from '@/components/ui/button'

interface Exercise {
    name: string
    sets: number
    reps: string
    rest_seconds: number
    notes?: string
}

interface Day {
    day: string
    focus: string
    exercises: Exercise[]
}

interface WorkoutPlan {
    summary: string
    days: Day[]
}

interface Props {
    hasProfile: boolean
    savedPlan: WorkoutPlan | null
    savedVersion: number | null
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getDefaultDayIndex(days: Day[]): number {
    if (days.length === 0) return 0

    const todayName = WEEKDAY_NAMES[new Date().getDay()].toLowerCase()
    const todayIndex = days.findIndex((day) => day.day.trim().toLowerCase() === todayName)
    if (todayIndex >= 0) return todayIndex

    const mondayIndex = days.findIndex((day) => day.day.trim().toLowerCase() === 'monday')
    return mondayIndex >= 0 ? mondayIndex : 0
}

export default function WorkoutClient({ hasProfile, savedPlan, savedVersion }: Props) {
    const [plan, setPlan] = useState<WorkoutPlan | null>(savedPlan)
    const [version, setVersion] = useState<number | null>(savedVersion)
    const [loading, setLoading] = useState(false)
    const [activeDay, setActiveDay] = useState(() => getDefaultDayIndex(savedPlan?.days || []))

    const handleGenerate = async () => {
        setLoading(true)
        const result = await generateWorkoutPlan()
        setLoading(false)
        if (result?.error) {
            toast.error(result.error)
        } else {
            setPlan(result.plan)
            setVersion(result.version!)
            setActiveDay(getDefaultDayIndex(result.plan.days))
            toast.success('Workout plan generated!')
        }
    }

    if (!hasProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg">
                    <Dumbbell className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Setup Required</h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-xs">Complete your fitness profile first so AI can generate a plan tailored to you.</p>
                </div>
                <Link href="/member/fitness-profile">
                    <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Complete Fitness Profile →</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Workout Plan</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {version ? `Version ${version} · Powered by Gemini` : 'Generate your personalised weekly workout plan'}
                    </p>
                </div>
                <Button onClick={handleGenerate} disabled={loading}
                    className={`shrink-0 ${plan ? 'bg-gray-800 hover:bg-gray-900' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-semibold`}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : plan ? <RefreshCw className="mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />}
                    {loading ? 'Generating…' : plan ? 'Regenerate' : 'Generate Plan'}
                </Button>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-8 text-center space-y-2">
                    <Loader2 className="mx-auto h-8 w-8 text-emerald-500 animate-spin" />
                    <p className="text-sm font-medium text-emerald-700">Gemini is crafting your personalised plan…</p>
                    <p className="text-xs text-emerald-500">This usually takes 10–20 seconds</p>
                </div>
            )}

            {/* Plan display */}
            {plan && !loading && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 p-4 text-white">
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">Plan Summary</p>
                        <p className="text-sm font-medium">{plan.summary}</p>
                    </div>

                    {/* Day tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                        {plan.days.map((d, i) => (
                            <button key={i} onClick={() => setActiveDay(i)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${activeDay === i ? 'bg-emerald-500 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {d.day}
                            </button>
                        ))}
                    </div>

                    {/* Active day */}
                    {plan.days[activeDay] && (
                        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{plan.days[activeDay].day}</p>
                                    <p className="text-xs text-gray-500">{plan.days[activeDay].focus}</p>
                                </div>
                                <span className="text-xs text-gray-400">{plan.days[activeDay].exercises.length} exercises</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {plan.days[activeDay].exercises.map((ex, i) => (
                                    <div key={i} className="px-5 py-3.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900">{ex.name}</p>
                                                {ex.notes && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{ex.notes}</p>}
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{ex.sets} sets</span>
                                                <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{ex.reps} reps</span>
                                                <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{ex.rest_seconds}s rest</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!plan && !loading && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <Dumbbell className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-500">No workout plan yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click &quot;Generate Plan&quot; to get your personalised workout plan</p>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Salad, RefreshCw, Zap, Flame } from 'lucide-react'
import { generateNutritionPlan } from './actions'
import { Button } from '@/components/ui/button'

interface Meal {
    name: string
    calories: number
    protein_g: number
    description: string
}

interface NutritionDay {
    day: string
    meals: { breakfast: Meal; lunch: Meal; dinner: Meal; snacks: Meal }
    total_calories: number
    total_protein_g: number
}

interface NutritionPlan {
    summary: string
    daily_calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    days: NutritionDay[]
}

const MEAL_COLORS: Record<string, string> = {
    breakfast: 'bg-amber-50 border-amber-200',
    lunch: 'bg-green-50 border-green-200',
    dinner: 'bg-blue-50 border-blue-200',
    snacks: 'bg-purple-50 border-purple-200',
}

const MEAL_LABEL: Record<string, string> = {
    breakfast: '🌅 Breakfast',
    lunch: '☀️ Lunch',
    dinner: '🌙 Dinner',
    snacks: '🍎 Snacks',
}

interface Props {
    hasProfile: boolean
    savedPlan: NutritionPlan | null
    savedVersion: number | null
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getDefaultDayIndex(days: NutritionDay[]): number {
    if (days.length === 0) return 0

    const todayName = WEEKDAY_NAMES[new Date().getDay()].toLowerCase()
    const todayIndex = days.findIndex((day) => day.day.trim().toLowerCase() === todayName)
    if (todayIndex >= 0) return todayIndex

    const mondayIndex = days.findIndex((day) => day.day.trim().toLowerCase() === 'monday')
    return mondayIndex >= 0 ? mondayIndex : 0
}

export default function NutritionClient({ hasProfile, savedPlan, savedVersion }: Props) {
    const [plan, setPlan] = useState<NutritionPlan | null>(savedPlan)
    const [version, setVersion] = useState<number | null>(savedVersion)
    const [loading, setLoading] = useState(false)
    const [activeDay, setActiveDay] = useState(() => getDefaultDayIndex(savedPlan?.days || []))

    const handleGenerate = async () => {
        setLoading(true)
        const result = await generateNutritionPlan()
        setLoading(false)
        if (result?.error) {
            toast.error(result.error)
        } else {
            setPlan(result.plan)
            setVersion(result.version!)
            setActiveDay(getDefaultDayIndex(result.plan.days))
            toast.success('Nutrition plan generated!')
        }
    }

    if (!hasProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 shadow-lg">
                    <Salad className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Setup Required</h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-xs">Complete your fitness profile so AI can tailor your meal plan.</p>
                </div>
                <Link href="/member/fitness-profile">
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">Complete Fitness Profile →</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Nutrition Plan</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {version ? `Version ${version} · 7-day meal plan · Powered by Gemini` : 'Generate a personalised 7-day meal plan'}
                    </p>
                </div>
                <Button onClick={handleGenerate} disabled={loading}
                    className={`shrink-0 ${plan ? 'bg-gray-800 hover:bg-gray-900' : 'bg-orange-500 hover:bg-orange-600'} text-white font-semibold`}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : plan ? <RefreshCw className="mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />}
                    {loading ? 'Generating…' : plan ? 'Regenerate' : 'Generate Plan'}
                </Button>
            </div>

            {loading && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-8 text-center space-y-2">
                    <Loader2 className="mx-auto h-8 w-8 text-orange-500 animate-spin" />
                    <p className="text-sm font-medium text-orange-700">Gemini is planning your meals…</p>
                    <p className="text-xs text-orange-400">This usually takes 10–20 seconds</p>
                </div>
            )}

            {plan && !loading && (
                <div className="space-y-4">
                    {/* Macro overview */}
                    <div className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-2">Daily Targets</p>
                        <p className="text-sm mb-3">{plan.summary}</p>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Calories', value: plan.daily_calories, unit: 'kcal' },
                                { label: 'Protein', value: plan.protein_g, unit: 'g' },
                                { label: 'Carbs', value: plan.carbs_g, unit: 'g' },
                                { label: 'Fat', value: plan.fat_g, unit: 'g' },
                            ].map(m => (
                                <div key={m.label} className="bg-white/15 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold">{m.value}</p>
                                    <p className="text-[10px] text-white/60">{m.label}<br />{m.unit}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Day tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                        {plan.days.map((d, i) => (
                            <button key={i} onClick={() => setActiveDay(i)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${activeDay === i ? 'bg-orange-500 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {d.day}
                            </button>
                        ))}
                    </div>

                    {/* Active day */}
                    {plan.days[activeDay] && (() => {
                        const day = plan.days[activeDay]
                        return (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-gray-900">{day.day}</p>
                                    <div className="flex gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />{day.total_calories} kcal</span>
                                        <span>{day.total_protein_g}g protein</span>
                                    </div>
                                </div>
                                {(Object.entries(day.meals) as [string, Meal][]).map(([mealKey, meal]) => (
                                    <div key={mealKey} className={`rounded-xl border p-4 ${MEAL_COLORS[mealKey] || 'bg-gray-50 border-gray-200'}`}>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">{MEAL_LABEL[mealKey]}</p>
                                                <p className="text-sm font-bold text-gray-900">{meal.name}</p>
                                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{meal.description}</p>
                                            </div>
                                            <div className="flex items-end justify-between gap-3 sm:justify-start sm:gap-6">
                                                <p className="text-sm font-bold text-gray-800">{meal.calories}</p>
                                                <p className="text-[10px] text-gray-400">kcal</p>
                                                <p className="text-xs font-medium text-gray-600">{meal.protein_g}g P</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })()}
                </div>
            )}

            {!plan && !loading && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <Salad className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-500">No nutrition plan yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click &quot;Generate Plan&quot; to get your personalised 7-day meal plan</p>
                </div>
            )}
        </div>
    )
}

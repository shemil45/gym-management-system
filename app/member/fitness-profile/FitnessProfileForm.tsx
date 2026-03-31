'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { saveFitnessProfile } from './actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const GOALS = [
    { value: 'weight_loss', label: '🔥 Weight Loss', desc: 'Burn fat, get leaner' },
    { value: 'muscle_gain', label: '💪 Muscle Gain', desc: 'Build strength & size' },
    { value: 'endurance', label: '🏃 Endurance', desc: 'Improve stamina & cardio' },
    { value: 'general', label: '⚡ General Fitness', desc: 'Stay active and healthy' },
]

const EXPERIENCE = [
    { value: 'beginner', label: 'Beginner', desc: '< 6 months' },
    { value: 'intermediate', label: 'Intermediate', desc: '6m – 2 years' },
    { value: 'advanced', label: 'Advanced', desc: '2+ years' },
]

const DIETS = [
    { value: 'non_veg', label: '🍗 Non-Veg' },
    { value: 'veg', label: '🥦 Vegetarian' },
    { value: 'vegan', label: '🌱 Vegan' },
]

interface Props {
    existing: {
        goal?: string | null
        experience?: string | null
        dietary_preference?: string | null
        height_cm?: number | null
        weight_kg?: number | null
        days_per_week?: number | null
        injuries?: string | null
    } | null
}

export default function FitnessProfileForm({ existing }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [goal, setGoal] = useState(existing?.goal || '')
    const [experience, setExperience] = useState(existing?.experience || '')
    const [diet, setDiet] = useState(existing?.dietary_preference || '')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!goal) { toast.error('Please select a fitness goal'); return }
        if (!experience) { toast.error('Please select your experience level'); return }
        setLoading(true)

        const fd = new FormData(e.currentTarget)
        fd.set('goal', goal)
        fd.set('experience', experience)
        fd.set('dietary_preference', diet)

        const result = await saveFitnessProfile(fd)
        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success('Fitness profile saved!')
            router.refresh()
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 space-y-8">

                {/* Goal */}
                <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-800">What&apos;s your primary goal? <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-2 gap-3">
                        {GOALS.map(g => (
                            <button key={g.value} type="button" onClick={() => setGoal(g.value)}
                                className={`rounded-xl border-2 p-3 text-left transition-all ${goal === g.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <p className="text-sm font-semibold text-gray-900">{g.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Experience */}
                <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-800">Experience level <span className="text-red-500">*</span></Label>
                    <div className="flex gap-3">
                        {EXPERIENCE.map(e => (
                            <button key={e.value} type="button" onClick={() => setExperience(e.value)}
                                className={`flex-1 rounded-xl border-2 p-3 text-center transition-all ${experience === e.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <p className="text-sm font-semibold text-gray-900">{e.label}</p>
                                <p className="text-xs text-gray-400">{e.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Physical stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="height_cm" className="text-sm font-medium text-gray-700">Height (cm)</Label>
                        <Input id="height_cm" name="height_cm" type="number" placeholder="175" defaultValue={existing?.height_cm || ''} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="weight_kg" className="text-sm font-medium text-gray-700">Weight (kg)</Label>
                        <Input id="weight_kg" name="weight_kg" type="number" placeholder="70" defaultValue={existing?.weight_kg || ''} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="days_per_week" className="text-sm font-medium text-gray-700">Workout days/week <span className="text-red-500">*</span></Label>
                        <Input id="days_per_week" name="days_per_week" type="number" min={1} max={7} placeholder="4" required defaultValue={existing?.days_per_week || ''} className="h-10" />
                    </div>
                </div>

                {/* Dietary preference */}
                <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-800">Dietary preference</Label>
                    <div className="flex gap-3">
                        {DIETS.map(d => (
                            <button key={d.value} type="button" onClick={() => setDiet(diet === d.value ? '' : d.value)}
                                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${diet === d.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Injuries */}
                <div className="space-y-1.5">
                    <Label htmlFor="injuries" className="text-sm font-medium text-gray-700">Any injuries or limitations?</Label>
                    <textarea id="injuries" name="injuries" placeholder="e.g. Lower back pain, bad knees…" defaultValue={existing?.injuries || ''}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none h-20" />
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {existing ? 'Update Fitness Profile' : 'Save Fitness Profile'}
                </Button>
            </div>
        </form>
    )
}

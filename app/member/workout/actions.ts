'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateJSON } from '@/lib/gemini'
import { revalidatePath } from 'next/cache'

const admin = () => createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type FitnessProfileRow = {
    days_per_week: number | null
    goal: string | null
    experience: string | null
    height_cm: number | null
    weight_kg: number | null
    injuries: string | null
}

type VersionRow = { version: number }
type WorkoutExercise = {
    name: string
    sets: number
    reps: string
    rest_seconds: number
    notes?: string
}

type WorkoutDay = {
    day: string
    focus: string
    exercises: WorkoutExercise[]
}

export type WorkoutPlan = {
    summary: string
    days: WorkoutDay[]
}

export type SavedWorkoutPlanRow = {
    plan_data: WorkoutPlan
    version: number
}

type GenerateWorkoutPlanResult =
    | { success: true; plan: WorkoutPlan; version: number }
    | { error: string }

export async function generateWorkoutPlan(): Promise<GenerateWorkoutPlanResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const db = admin()

    // Get fitness profile
    const { data: profile } = await db.from('fitness_profiles').select('*').eq('user_id', user.id).single()
    if (!profile) return { error: 'Please complete your fitness profile first.' }

    // Get latest version number
    const { data: existing } = await db.from('workout_plans').select('version').eq('user_id', user.id).order('version', { ascending: false }).limit(1)
    const nextVersion = existing && existing.length > 0 ? (existing[0] as VersionRow).version + 1 : 1

    const typedProfile = profile as FitnessProfileRow
    const prompt = `
Generate a ${typedProfile.days_per_week}-day per week workout plan for a person with these details:
- Goal: ${typedProfile.goal}
- Experience: ${typedProfile.experience}
- Height: ${typedProfile.height_cm ?? 'unknown'} cm, Weight: ${typedProfile.weight_kg ?? 'unknown'} kg
- Injuries/Limitations: ${typedProfile.injuries || 'none'}

Return a JSON object with this exact shape:
{
  "summary": "A one-line summary of this plan",
  "days": [
    {
      "day": "Monday",
      "focus": "Chest & Triceps",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 90, "notes": "Keep elbows at 45 degrees" }
      ]
    }
  ]
}

Include exactly ${typedProfile.days_per_week} training days and add rest days as needed. Exercises should be appropriate for ${typedProfile.experience} level. Be specific with form notes.`

    try {
        const plan = await generateJSON<WorkoutPlan>(prompt)

        const { data: saved, error } = await db.from('workout_plans').insert({
            user_id: user.id,
            version: nextVersion,
            plan_data: plan,
        }).select().single()

        if (error) return { error: error.message }

        revalidatePath('/member/workout')
        return { success: true, plan: (saved as SavedWorkoutPlanRow).plan_data, version: nextVersion }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { error: 'Failed to generate plan: ' + message }
    }
}

export async function getLatestWorkoutPlan(): Promise<SavedWorkoutPlanRow | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await admin()
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)

    return (data?.[0] as SavedWorkoutPlanRow | undefined) ?? null
}

export async function hasFitnessProfile(): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await admin().from('fitness_profiles').select('id').eq('user_id', user.id).single()
    return !!data
}

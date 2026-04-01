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
    goal: string | null
    dietary_preference: string | null
    height_cm: number | null
    weight_kg: number | null
    experience: string | null
}

type VersionRow = { version: number }
type NutritionMeal = {
    name: string
    calories: number
    protein_g: number
    description: string
}

export type NutritionPlan = {
    summary: string
    daily_calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    days: {
        day: string
        meals: {
            breakfast: NutritionMeal
            lunch: NutritionMeal
            dinner: NutritionMeal
            snacks: NutritionMeal
        }
        total_calories: number
        total_protein_g: number
    }[]
}

export type SavedNutritionPlanRow = {
    plan_data: NutritionPlan
    version: number
}

type GenerateNutritionPlanResult =
    | { success: true; plan: NutritionPlan; version: number }
    | { error: string }

export async function generateNutritionPlan(): Promise<GenerateNutritionPlanResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const db = admin()

    const { data: profile } = await db.from('fitness_profiles').select('*').eq('user_id', user.id).single()
    if (!profile) return { error: 'Please complete your fitness profile first.' }

    const { data: existing } = await db.from('nutrition_plans').select('version').eq('user_id', user.id).order('version', { ascending: false }).limit(1)
    const nextVersion = existing && existing.length > 0 ? (existing[0] as VersionRow).version + 1 : 1

    const p = profile as FitnessProfileRow
    const prompt = `
Create a 7-day meal plan for:
- Goal: ${p.goal}
- Dietary preference: ${p.dietary_preference || 'no restriction'}
- Height: ${p.height_cm ?? 'unknown'} cm, Weight: ${p.weight_kg ?? 'unknown'} kg
- Experience: ${p.experience}

Return JSON with this exact shape:
{
  "summary": "Brief description of this plan",
  "daily_calories": 2200,
  "protein_g": 150,
  "carbs_g": 220,
  "fat_g": 70,
  "days": [
    {
      "day": "Monday",
      "meals": {
        "breakfast": { "name": "Oatmeal with berries", "calories": 380, "protein_g": 12, "description": "1 cup oats, mixed berries, 1 tbsp honey" },
        "lunch": { "name": "Grilled chicken salad", "calories": 520, "protein_g": 45, "description": "200g chicken, mixed greens, olive oil dressing" },
        "dinner": { "name": "Salmon with rice", "calories": 620, "protein_g": 42, "description": "200g salmon, 1 cup brown rice, steamed broccoli" },
        "snacks": { "name": "Greek yogurt + almonds", "calories": 280, "protein_g": 18, "description": "150g Greek yogurt, 20g almonds" }
      },
      "total_calories": 1800,
      "total_protein_g": 117
    }
  ]
}`

    try {
        const plan = await generateJSON<NutritionPlan>(prompt)
        const { data: saved, error } = await db.from('nutrition_plans').insert({
            user_id: user.id,
            version: nextVersion,
            plan_data: plan,
        }).select().single()

        if (error) return { error: error.message }

        revalidatePath('/member/nutrition')
        return { success: true, plan: (saved as SavedNutritionPlanRow).plan_data, version: nextVersion }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { error: 'Failed to generate plan: ' + message }
    }
}

export async function getLatestNutritionPlan(): Promise<SavedNutritionPlanRow | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await admin()
        .from('nutrition_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)

    return (data?.[0] as SavedNutritionPlanRow | undefined) ?? null
}

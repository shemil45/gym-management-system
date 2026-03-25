'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = () => createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function saveFitnessProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const admin = supabaseAdmin()

    const payload = {
        user_id: user.id,
        goal: formData.get('goal') as string,
        experience: formData.get('experience') as string,
        injuries: (formData.get('injuries') as string) || null,
        days_per_week: parseInt(formData.get('days_per_week') as string),
        dietary_preference: (formData.get('dietary_preference') as string) || null,
        height_cm: formData.get('height_cm') ? parseFloat(formData.get('height_cm') as string) : null,
        weight_kg: formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : null,
    }

    const { error } = await admin.from('fitness_profiles').upsert(payload, { onConflict: 'user_id' })
    if (error) return { error: error.message }

    revalidatePath('/member/workout')
    revalidatePath('/member/nutrition')
    revalidatePath('/member/ai-trainer')
    return { success: true }
}

export async function getFitnessProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabaseAdmin()
        .from('fitness_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

    return data
}

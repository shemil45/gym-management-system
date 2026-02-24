'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPlan(formData: FormData) {
    const supabase = await createClient()

    const name = (formData.get('name') as string).trim()
    const price = parseFloat(formData.get('price') as string)
    const duration_days = parseInt(formData.get('duration_days') as string)
    const description = (formData.get('description') as string).trim() || null

    if (!name) return { error: 'Plan name is required' }
    if (!price || price <= 0) return { error: 'Enter a valid price' }
    if (!duration_days || duration_days <= 0) return { error: 'Enter a valid duration' }

    const { error } = await supabase.from('membership_plans').insert({
        name, price, duration_days, description, is_active: true,
    })

    if (error) return { error: error.message }
    revalidatePath('/admin/plans')
    revalidatePath('/admin/members/add')
    return { success: true }
}

export async function updatePlan(formData: FormData) {
    const supabase = await createClient()

    const id = formData.get('id') as string
    const name = (formData.get('name') as string).trim()
    const price = parseFloat(formData.get('price') as string)
    const duration_days = parseInt(formData.get('duration_days') as string)
    const description = (formData.get('description') as string).trim() || null

    if (!name) return { error: 'Plan name is required' }
    if (!price || price <= 0) return { error: 'Enter a valid price' }
    if (!duration_days || duration_days <= 0) return { error: 'Enter a valid duration' }

    const { error } = await supabase
        .from('membership_plans')
        .update({ name, price, duration_days, description })
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/plans')
    return { success: true }
}

export async function togglePlanStatus(id: string, isActive: boolean) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('membership_plans')
        .update({ is_active: isActive })
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/plans')
    revalidatePath('/admin/members/add')
    return { success: true }
}

export async function deletePlan(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('membership_plans').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/plans')
    return { success: true }
}

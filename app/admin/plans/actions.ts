'use server'

import { createClient } from '@/lib/supabase/server'
import type { InsertTables, UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getActiveImpersonation, IMPERSONATION_READONLY_MESSAGE } from '@/lib/platform/impersonation-ledger'

export async function createPlan(formData: FormData) {
    const { gym } = await getCurrentGymContext()
    if (!gym) return { error: 'You do not have permission to change plans.' }

    // Plans are shared, real gym config; there is no demo version of them.
    if (await getActiveImpersonation(gym.id)) return { error: IMPERSONATION_READONLY_MESSAGE }

    const supabase = await createClient()

    const name = (formData.get('name') as string).trim()
    const price = parseFloat(formData.get('price') as string)
    const duration_days = parseInt(formData.get('duration_days') as string)
    const description = (formData.get('description') as string).trim() || null

    if (!name) return { error: 'Plan name is required' }
    if (!price || price <= 0) return { error: 'Enter a valid price' }
    if (!duration_days || duration_days <= 0) return { error: 'Enter a valid duration' }

    const payload: InsertTables<'membership_plans'> = {
        name,
        price,
        duration_days,
        description,
        is_active: true,
    }

    const { error } = await supabase.from('membership_plans').insert(payload as never)

    if (error) return { error: error.message }
    revalidatePath('/admin/plans')
    revalidatePath('/admin/members/add')
    return { success: true }
}

export async function updatePlan(formData: FormData) {
    const { gym } = await getCurrentGymContext()
    if (!gym) return { error: 'You do not have permission to change plans.' }

    if (await getActiveImpersonation(gym.id)) return { error: IMPERSONATION_READONLY_MESSAGE }

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
        .update(({
            name,
            price,
            duration_days,
            description,
        } satisfies UpdateTables<'membership_plans'>) as never)
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/plans')
    return { success: true }
}

export async function togglePlanStatus(id: string, isActive: boolean) {
    const { gym } = await getCurrentGymContext()
    if (!gym) return { error: 'You do not have permission to change plans.' }

    if (await getActiveImpersonation(gym.id)) return { error: IMPERSONATION_READONLY_MESSAGE }

    const supabase = await createClient()
    const { error } = await supabase
        .from('membership_plans')
        .update(({ is_active: isActive } satisfies UpdateTables<'membership_plans'>) as never)
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/plans')
    revalidatePath('/admin/members/add')
    return { success: true }
}

export async function deletePlan(id: string) {
    const { gym } = await getCurrentGymContext()
    if (!gym) return { error: 'You do not have permission to change plans.' }

    if (await getActiveImpersonation(gym.id)) return { error: IMPERSONATION_READONLY_MESSAGE }

    const supabase = await createClient()
    const { error } = await supabase.from('membership_plans').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/plans')
    return { success: true }
}

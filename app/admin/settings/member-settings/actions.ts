'use server'

import { createClient } from '@/lib/supabase/server'
import type { UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

export async function updateMemberIdSettings(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }

    const prefix = (formData.get('member_id_prefix') as string | null)?.trim()
    if (!prefix || prefix.length > 10) {
        return { error: 'Prefix must be 1-10 characters.' }
    }

    const nextNumberValue = (formData.get('member_id_next_number') as string | null)?.trim()
    const nextNumber = Number(nextNumberValue)
    if (!nextNumberValue || !Number.isInteger(nextNumber) || nextNumber < 1) {
        return { error: 'Next number must be a whole number of 1 or more.' }
    }

    const paddingValue = (formData.get('member_id_padding') as string | null)?.trim()
    const padding = Number(paddingValue)
    if (!paddingValue || !Number.isInteger(padding) || padding < 1 || padding > 10) {
        return { error: 'Number padding must be a whole number between 1 and 10.' }
    }

    const supabase = await createClient()
    const { data: updated, error } = await supabase
        .from('gyms')
        .update(({
            member_id_prefix: prefix,
            member_id_next_number: nextNumber,
            member_id_padding: padding,
        } satisfies UpdateTables<'gyms'>) as never)
        .eq('id', viewer.gym.id)
        .select('id')
        .maybeSingle()

    if (error) return { error: getErrorMessage(error, 'Failed to update member ID settings') }
    if (!updated) return { error: 'Settings could not be saved — please refresh and try again.' }

    revalidatePath('/admin/settings/member-settings')
    revalidatePath('/admin/members/add')
    return { success: true }
}

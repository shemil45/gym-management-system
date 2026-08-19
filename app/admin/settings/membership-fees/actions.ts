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

export async function updateMembershipFeeSettings(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }

    const feeValue = (formData.get('default_admission_fee') as string | null)?.trim()
    const fee = Number(feeValue)

    if (!feeValue || !Number.isFinite(fee) || fee < 0) {
        return { error: 'Default admission fee must be a non-negative number.' }
    }

    const allowWaiver = formData.get('allow_admission_fee_waiver') === 'true'
    const allowCustomStartDate = formData.get('allow_custom_membership_start_date') === 'true'

    const supabase = await createClient()
    const { error } = await supabase
        .from('gyms')
        .update(({
            default_admission_fee: fee,
            allow_admission_fee_waiver: allowWaiver,
            allow_custom_membership_start_date: allowCustomStartDate,
        } satisfies UpdateTables<'gyms'>) as never)
        .eq('id', viewer.gym.id)

    if (error) return { error: getErrorMessage(error, 'Failed to update membership & fee settings') }

    revalidatePath('/admin/settings/membership-fees')
    revalidatePath('/admin/members/add')
    return { success: true }
}

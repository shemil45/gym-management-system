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

function parseDays(formData: FormData, field: string, min: number, max: number, label: string) {
    const raw = formData.get(field) as string | null
    const value = raw ? parseInt(raw, 10) : NaN

    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${label} must be a whole number between ${min} and ${max}.`)
    }

    return value
}

export async function updateNotificationSettings(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }

    let payload: UpdateTables<'gyms'>

    try {
        payload = {
            notify_expiry_reminder_enabled: formData.get('notify_expiry_reminder_enabled') === 'true',
            notify_expiry_reminder_days: parseDays(formData, 'notify_expiry_reminder_days', 1, 90, 'Expiry reminder days'),
            notify_expired_notice_enabled: formData.get('notify_expired_notice_enabled') === 'true',
            notify_expired_notice_days: parseDays(formData, 'notify_expired_notice_days', 0, 90, 'Expired notice days'),
            notify_payment_confirmation_enabled: formData.get('notify_payment_confirmation_enabled') === 'true',
            notify_renewal_confirmation_enabled: formData.get('notify_renewal_confirmation_enabled') === 'true',
            notify_welcome_message_enabled: formData.get('notify_welcome_message_enabled') === 'true',
        } satisfies UpdateTables<'gyms'>
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Invalid notification settings.' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('gyms')
        .update(payload as never)
        .eq('id', viewer.gym.id)

    if (error) return { error: getErrorMessage(error, 'Failed to update notification settings') }

    revalidatePath('/admin/settings/notifications')
    return { success: true }
}

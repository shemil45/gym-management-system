'use server'

import { createClient } from '@/lib/supabase/server'
import type { UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getAvatarStoragePath } from '@/lib/utils/storage'

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

function trimmedOrNull(value: FormDataEntryValue | null) {
    const trimmed = (value as string | null)?.trim()
    return trimmed || null
}

export async function updateGymProfile(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }

    const name = (formData.get('name') as string | null)?.trim()
    if (!name) {
        return { error: 'Gym name is required.' }
    }

    const logoUrl = trimmedOrNull(formData.get('logo_url'))
    const previousLogoUrl = trimmedOrNull(formData.get('previous_logo_url'))

    const supabase = await createClient()
    const { data: updated, error } = await supabase
        .from('gyms')
        .update(({
            name,
            logo_url: logoUrl,
            contact_phone: trimmedOrNull(formData.get('contact_phone')),
            contact_email: trimmedOrNull(formData.get('contact_email')),
            website: trimmedOrNull(formData.get('website')),
            address: trimmedOrNull(formData.get('address')),
            city: trimmedOrNull(formData.get('city')),
            state: trimmedOrNull(formData.get('state')),
            postal_code: trimmedOrNull(formData.get('postal_code')),
            country: trimmedOrNull(formData.get('country')),
            gstin: trimmedOrNull(formData.get('gstin')),
        } satisfies UpdateTables<'gyms'>) as never)
        .eq('id', viewer.gym.id)
        .select('id')
        .maybeSingle()

    if (error) return { error: getErrorMessage(error, 'Failed to update gym profile') }
    if (!updated) return { error: 'Gym profile could not be saved — please refresh and try again.' }

    if (previousLogoUrl && previousLogoUrl !== logoUrl) {
        const previousPath = getAvatarStoragePath(previousLogoUrl)
        if (previousPath && previousPath.startsWith('gym-logo-')) {
            const supabaseAdmin = getSupabaseAdmin()
            await supabaseAdmin.storage.from('avatars').remove([previousPath])
        }
    }

    revalidatePath('/admin/settings/gym-profile')
    return { success: true }
}

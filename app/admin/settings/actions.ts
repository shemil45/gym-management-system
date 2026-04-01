'use server'

import { createClient } from '@/lib/supabase/server'
import type { UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const full_name = (formData.get('full_name') as string).trim()
    const phone = (formData.get('phone') as string).trim()

    if (!full_name) return { error: 'Full name is required' }

    const { error } = await supabase
        .from('profiles')
        .update(({
            full_name,
            phone: phone || null,
        } satisfies UpdateTables<'profiles'>) as never)
        .eq('id', user.id)

    if (error) return { error: getErrorMessage(error, 'Failed to update profile') }

    revalidatePath('/admin/settings')
    return { success: true }
}



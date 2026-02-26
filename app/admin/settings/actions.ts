'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const full_name = (formData.get('full_name') as string).trim()
    const phone = (formData.get('phone') as string).trim()

    if (!full_name) return { error: 'Full name is required' }

    const { error } = await supabase
        .from('profiles')
        .update({ full_name, phone: phone || null })
        .eq('id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/admin/settings')
    return { success: true }
}



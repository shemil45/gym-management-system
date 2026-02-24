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

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirm = formData.get('confirm_password') as string

    if (!password || password.length < 6) return { error: 'Password must be at least 6 characters' }
    if (password !== confirm) return { error: 'Passwords do not match' }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }

    return { success: true }
}

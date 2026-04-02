import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'

type AdminProfile = {
    id: string
    role: 'admin' | 'member'
    full_name: string
    phone: string | null
    photo_url: string | null
}

export const getCurrentAdminContext = cache(async () => {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return {
            profile: null,
            user: null,
        }
    }

    const profileResult = await supabase
        .from('profiles')
        .select('id, role, full_name, phone, photo_url')
        .eq('id', user.id)
        .single()
    const { data: profile } = profileResult as unknown as QueryResult<AdminProfile | null>

    return {
        profile,
        user,
    }
})

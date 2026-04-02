import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'

type ProfileRole = { role: 'admin' | 'member' }

export default async function AuthRedirectPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const profileResult = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    const { data: profile } = profileResult as unknown as QueryResult<ProfileRole | null>

    if (!profile) {
        redirect('/login')
    }

    if (profile.role === 'admin') {
        redirect('/admin/dashboard')
    }

    const memberResult = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .single()
    const { data: member } = memberResult as unknown as QueryResult<{ id: string } | null>

    if (!member) {
        redirect('/complete-profile')
    }

    redirect('/member/dashboard')
}

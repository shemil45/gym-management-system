import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { QueryResult } from '@/lib/types'
import SettingsDashboard from '@/components/settings/SettingsDashboard'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const profileResult = await supabase
        .from('profiles')
        .select('id, full_name, phone, photo_url, role')
        .eq('id', user.id)
        .single()
    const { data: profile } = profileResult as unknown as QueryResult<{
        id: string
        full_name: string
        phone: string | null
        photo_url: string | null
        role: 'admin' | 'member'
    } | null>

    return (
        <SettingsDashboard
            profile={profile!}
            email={user.email ?? ''}
        />
    )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsDashboard from '@/components/settings/SettingsDashboard'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, phone, photo_url, role')
        .eq('id', user.id)
        .single()

    return (
        <SettingsDashboard
            profile={profile!}
            email={user.email ?? ''}
        />
    )
}

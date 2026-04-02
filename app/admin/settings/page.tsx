import { redirect } from 'next/navigation'
import SettingsDashboard from '@/components/settings/SettingsDashboard'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'

export default async function SettingsPage() {
    const { user, profile } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || profile.role !== 'admin') redirect('/member/dashboard')

    return (
        <SettingsDashboard
            profile={profile}
            email={user.email ?? ''}
        />
    )
}

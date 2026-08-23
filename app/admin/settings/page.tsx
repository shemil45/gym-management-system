import { redirect } from 'next/navigation'
import SettingsHub from '@/components/settings/SettingsHub'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'

export default async function SettingsPage() {
    const { user, profile } = await getCurrentAdminContext()

    if (!user) redirect('/admin/login')
    if (!profile || !isStaffRole(profile.role)) redirect('/member')

    return <SettingsHub />
}

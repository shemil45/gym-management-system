import { redirect } from 'next/navigation'
import AccountSettings from '@/components/settings/AccountSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'

export default async function AccountSettingsPage() {
    const { user, profile } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || !isStaffRole(profile.role)) redirect('/member')

    return (
        <AccountSettings
            profile={profile}
            email={user.email ?? ''}
        />
    )
}

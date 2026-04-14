import { redirect } from 'next/navigation'
import AdminShell from '@/components/layout/AdminShell'
import { AdminThemeProvider } from '@/components/layout/AdminThemeContext'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, gym, needsGymSelection, isStaff } = await getCurrentAdminContext()

    if (!user) {
        redirect('/login')
    }

    if (needsGymSelection || !gym) {
        redirect('/select-gym')
    }

    if (!profile || !isStaffRole(profile.role) || !isStaff) {
        redirect('/member/dashboard')
    }

    return (
        <SidebarProvider>
            <AdminThemeProvider>
                <AdminShell user={{ ...user, ...profile, gym_name: gym.name }}>{children}</AdminShell>
            </AdminThemeProvider>
        </SidebarProvider>
    )
}

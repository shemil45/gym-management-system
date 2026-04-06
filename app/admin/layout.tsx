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
    const { user, profile } = await getCurrentAdminContext()

    if (!user) {
        redirect('/login')
    }

    if (!profile || !isStaffRole(profile.role)) {
        redirect('/member/dashboard')
    }

    return (
        <SidebarProvider>
            <AdminThemeProvider>
                <AdminShell user={{ ...user, ...profile }}>{children}</AdminShell>
            </AdminThemeProvider>
        </SidebarProvider>
    )
}

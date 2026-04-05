import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminHeader from '@/components/layout/AdminHeader'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { Toaster } from 'sonner'

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
            <div className="min-h-screen bg-[#eef3fb]">
                <Toaster richColors position="top-right" />
                <AdminSidebar />
                <div className="lg:pl-[100px] xl:pl-[110px]">
                    <AdminHeader user={{ ...user, ...profile }} />
                    <main className="px-4 pb-24 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}

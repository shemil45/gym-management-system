import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminHeader from '@/components/layout/AdminHeader'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile } = await getCurrentAdminContext()

    if (!user) {
        redirect('/login')
    }

    if (!profile || profile.role !== 'admin') {
        redirect('/member/dashboard')
    }

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-[#f4f6fa]">
                <AdminSidebar />
                <div className="lg:pl-[100px] xl:pl-[110px]">
                    <AdminHeader user={{ ...user, ...profile }} />
                    <main className="p-6">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}

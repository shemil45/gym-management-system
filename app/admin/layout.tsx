import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminHeader from '@/components/layout/AdminHeader'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, photo_url')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        redirect('/member/dashboard')
    }

    return (
        <div className="min-h-screen bg-[#f4f6fa]">
            <AdminSidebar />
            <div className="lg:pl-[100px] xl:pl-[110px]">
                <AdminHeader user={{ ...user, ...profile }} />
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}

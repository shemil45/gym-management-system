import { redirect } from 'next/navigation'
import MemberSidebar from '@/components/layout/MemberSidebar'
import MemberHeader from '@/components/layout/MemberHeader'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { Toaster } from 'sonner'
import { getCurrentMemberContext } from '@/lib/auth/member-server'

export default async function MemberLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, member } = await getCurrentMemberContext()

    if (!user) {
        redirect('/login')
    }

    if (!profile || profile.role !== 'member') {
        redirect('/admin/dashboard')
    }

    if (!member) {
        redirect('/complete-profile')
    }

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-[#f4f6fa]">
                <Toaster richColors position="top-right" />
                <MemberSidebar />
                <div className="lg:pl-[100px] xl:pl-[110px]">
                    <MemberHeader
                        user={{
                            email: user.email,
                            full_name: profile.full_name,
                            photo_url: profile.photo_url,
                            member_id: member?.member_id ?? null,
                        }}
                    />
                    <main className="p-4 sm:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}

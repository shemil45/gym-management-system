import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import MemberSidebar from '@/components/layout/MemberSidebar'
import MemberHeader from '@/components/layout/MemberHeader'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { Toaster } from 'sonner'

export default async function MemberLayout({
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

    const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    const { data: profile } = profileResult as unknown as QueryResult<{
        role: 'admin' | 'member'
        full_name: string
        photo_url: string | null
    } | null>

    if (!profile || profile.role !== 'member') {
        redirect('/admin/dashboard')
    }

    // Get member record for member_id
    const memberResult = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single()
    const { data: member } = memberResult as unknown as QueryResult<{ member_id: string } | null>

    // If there is no member record, they need to complete their profile
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

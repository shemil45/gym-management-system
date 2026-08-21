import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { getCurrentMemberContext } from '@/lib/auth/member-server'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { getNotifications } from '@/lib/member/notifications'
import { greetingFor } from '@/lib/member/greeting'
import { MemberThemeProvider } from '@/components/member/MemberTheme'
import { BottomNav, DesktopRail, TopBar } from '@/components/member/MemberChrome'
import './member.css'

export const metadata = {
    title: {
        default: 'Member portal',
        template: '%s | Member portal',
    },
}

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, gym } = await getCurrentMemberContext()

    if (!user || !gym) redirect('/login')
    if (!profile || profile.role !== 'member') redirect('/admin/dashboard')

    const data = await getMemberPortalData()
    const firstName = data?.member.firstName ?? profile.full_name?.split(' ')[0] ?? 'there'
    const unread = data ? getNotifications(data).filter((n) => n.unread).length : 0

    return (
        <MemberThemeProvider>
            <div className="min-h-[100dvh] bg-[var(--m-bg)] text-[var(--m-ink)]">
                <Toaster richColors position="top-center" offset={72} />

                <TopBar homeTitle={greetingFor(firstName)} gymName={gym.name} unread={unread} />
                <DesktopRail
                    gymName={gym.name}
                    memberName={data?.member.fullName ?? profile.full_name ?? 'Member'}
                    memberCode={data?.member.memberCode ?? '-'}
                    unread={unread}
                />

                <main className="m-main lg:pl-[248px]">
                    <div className="pt-4 lg:mx-auto lg:max-w-[1120px] lg:px-10 lg:pb-10 lg:pt-10">
                        {children}
                    </div>
                </main>

                <BottomNav />
            </div>
        </MemberThemeProvider>
    )
}

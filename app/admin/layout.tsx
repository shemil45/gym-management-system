import { redirect } from 'next/navigation'
import AdminShell from '@/components/layout/AdminShell'
import { AdminThemeProvider } from '@/components/layout/AdminThemeContext'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { getCurrentPlatformContext } from '@/lib/platform/server'
import { stopImpersonation } from '@/app/platform/actions'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, gym, isStaff } = await getCurrentAdminContext()
    const platformContext = await getCurrentPlatformContext()

    if (!user) {
        redirect('/login')
    }

    if (!gym) {
        redirect('/login')
    }

    if (!profile || !isStaffRole(profile.role) || !isStaff) {
        redirect('/member/dashboard')
    }

    return (
        <AdminThemeProvider>
            <AdminShell user={{ ...user, ...profile, gym_name: gym.name }}>
                {platformContext.activeImpersonation ? (
                    <div className="mb-5 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-50">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold">Platform impersonation mode is active.</p>
                                <p className="text-sm text-amber-100/75">
                                    You are viewing {gym.name} with elevated support access. All actions are audited.
                                </p>
                            </div>
                            <form action={stopImpersonation}>
                                <button className="rounded-full border border-amber-200/20 bg-amber-50/10 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-50/20">
                                    Exit impersonation
                                </button>
                            </form>
                        </div>
                    </div>
                ) : null}
                {children}
            </AdminShell>
        </AdminThemeProvider>
    )
}

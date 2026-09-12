import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminShell from '@/components/layout/AdminShell'
import { AdminThemeProvider } from '@/components/layout/AdminThemeContext'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { getPlatformSession } from '@/lib/platform/auth'
import AccountNotice from '@/components/layout/AccountNotice'
import HideOnRenewPage from '@/components/layout/HideOnRenewPage'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'
import { stopImpersonation } from '@/app/platform/actions'
import { requireActiveSubscription } from '@/lib/billing/gate'
import { sweepExpiredImpersonations } from '@/lib/platform/impersonation-ledger'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, gym, isStaff } = await getCurrentAdminContext()
    const platformSession = await getPlatformSession()

    if (!user) {
        redirect('/admin/login')
    }

    if (!gym) {
        // A platform admin lands here with no gym exactly when their support
        // session has ended (expired, or closed from another tab): they hold
        // no tenant membership by design. The tenant login form is the wrong
        // door for someone still signed in to the platform.
        redirect(platformSession.admin ? '/platform' : '/admin/login')
    }

    if (!profile || !isStaffRole(profile.role) || !isStaff) {
        redirect('/member')
    }

    // Lapsed subscriptions are bounced here, before the shell streams, so the
    // redirect is a single clean navigation. See lib/billing/gate.ts.
    const pathname = (await headers()).get('x-pathname') ?? ''
    await requireActiveSubscription(gym.id, pathname)

    // Timed-out support sessions are cleaned up here as well as by cron, so
    // the tenant does not see demo rows for up to 15 minutes after a timeout.
    // Never awaited past a short budget and never allowed to fail the page.
    await Promise.race([
        sweepExpiredImpersonations().catch((err) => console.error('[impersonation] lazy sweep failed', err)),
        new Promise((resolve) => setTimeout(resolve, 1500)),
    ])

    return (
        <AdminThemeProvider>
            <AdminShell user={{ ...user, ...profile, gym_name: gym.name }}>
                {platformSession.impersonation ? (
                    <ImpersonationBanner
                        gymName={gym.name}
                        expiresAt={platformSession.impersonation.expires_at}
                        stopAction={stopImpersonation}
                    />
                ) : null}

                <HideOnRenewPage>
                    <AccountNotice gymId={gym.id} />
                </HideOnRenewPage>

                {children}
            </AdminShell>
        </AdminThemeProvider>
    )
}

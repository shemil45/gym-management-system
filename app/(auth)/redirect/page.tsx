import { redirect } from 'next/navigation'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getPlatformSession } from '@/lib/platform/auth'

/**
 * Single post-authentication router.
 *
 * Order matters. A platform admin has no tenant membership by design, so the
 * `isStaff` check below is false for them; without an explicit branch they
 * fell through to the member portal and were bounced to /member/login, which
 * is where the "signup redirects to member login" report came from.
 */
export default async function AuthRedirectPage() {
    const context = await getCurrentGymContext()
    const { user } = context

    if (!user || !context.profile) {
        redirect('/admin/login')
    }

    const platform = await getPlatformSession()

    if (platform.admin) {
        // An open support session means they deliberately went into a tenant
        // workspace; keep them there instead of pulling them back up.
        redirect(platform.impersonation ? '/admin/dashboard' : '/platform')
    }

    if (context.isStaff) {
        redirect('/admin/dashboard')
    }

    if (context.role === 'member' && context.gym) {
        redirect('/member')
    }

    // Signed in, but attached to no gym at all. Sending them to either portal
    // would bounce them straight back here, so offer the one action that
    // resolves it: create a workspace.
    redirect('/admin/register?state=no-workspace')
}

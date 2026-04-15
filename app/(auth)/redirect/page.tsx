import { redirect } from 'next/navigation'
import { getCurrentGymContext } from '@/lib/auth/gym-context'

export default async function AuthRedirectPage() {
    const context = await getCurrentGymContext()
    const { user } = context

    if (!user) {
        redirect('/login')
    }

    if (!context.profile) {
        redirect('/login')
    }

    // Always show the chooser after sign-in when the account can access multiple gyms,
    // even if a previous active_gym_id exists.
    if (context.needsGymSelection || context.accessibleGyms.length > 1) {
        redirect('/select-gym')
    }

    if (context.isStaff) {
        redirect('/admin/dashboard')
    }

    if (!context.member) {
        redirect('/complete-profile')
    }

    redirect('/member/dashboard')
}

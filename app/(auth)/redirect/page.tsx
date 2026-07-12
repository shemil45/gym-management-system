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

    if (context.isStaff) {
        redirect('/admin/dashboard')
    }

    redirect('/member/dashboard')
}

import { redirect } from 'next/navigation'
import RegisterGymOwnerForm from '@/app/(auth)/admin/register/RegisterGymOwnerForm'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getPlatformSession } from '@/lib/platform/auth'

export const metadata = {
    title: 'Create your gym',
}

export default async function AdminRegisterPage({
    searchParams,
}: {
    searchParams: Promise<{ state?: string }>
}) {
    const { state } = await searchParams
    const context = await getCurrentGymContext()

    if (context.user) {
        const platform = await getPlatformSession()

        // Only bounce a signed-in visitor when they actually have somewhere to
        // land. Bouncing unconditionally sent gym-less accounts into a
        // /redirect -> /admin/register -> /redirect loop.
        if (platform.admin) redirect('/platform')
        if (context.isStaff) redirect('/admin/dashboard')
        if (context.role === 'member' && context.gym) redirect('/member')
    }

    return <RegisterGymOwnerForm noWorkspace={state === 'no-workspace'} />
}

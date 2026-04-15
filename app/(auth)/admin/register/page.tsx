import { redirect } from 'next/navigation'
import RegisterGymOwnerForm from '@/app/(auth)/admin/register/RegisterGymOwnerForm'
import { getCurrentGymContext } from '@/lib/auth/gym-context'

export default async function AdminRegisterPage() {
    const context = await getCurrentGymContext()

    if (context.user) {
        redirect('/redirect')
    }

    return <RegisterGymOwnerForm />
}

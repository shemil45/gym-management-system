'use server'

import { redirect } from 'next/navigation'
import { setActiveGymForCurrentUser } from '@/lib/auth/gym-context'

export async function chooseGym(formData: FormData) {
    const gymId = (formData.get('gym_id') as string | null)?.trim()

    if (!gymId) {
        redirect('/select-gym')
    }

    const result = await setActiveGymForCurrentUser(gymId)

    if ('error' in result) {
        redirect('/select-gym')
    }

    redirect(result.isStaff ? '/admin/dashboard' : '/member/dashboard')
}

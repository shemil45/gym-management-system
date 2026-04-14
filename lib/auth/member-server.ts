import { cache } from 'react'
import { getCurrentGymContext } from '@/lib/auth/gym-context'

export const getCurrentMemberContext = cache(async () => {
    const context = await getCurrentGymContext()

    return {
        user: context.user,
        profile: context.profile,
        gym: context.gym,
        member: context.member,
        accessibleGyms: context.accessibleGyms,
        needsGymSelection: context.needsGymSelection,
        role: context.role,
        isStaff: context.isStaff,
    }
})

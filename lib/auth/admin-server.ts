import { cache } from 'react'
import { getCurrentGymContext } from '@/lib/auth/gym-context'

export const getCurrentAdminContext = cache(async () => {
    const context = await getCurrentGymContext()

    return {
        user: context.user,
        profile: context.profile,
        gym: context.gym,
        admin: context.admin,
        accessibleGyms: context.accessibleGyms,
        needsGymSelection: context.needsGymSelection,
        role: context.role,
        isStaff: context.isStaff,
    }
})

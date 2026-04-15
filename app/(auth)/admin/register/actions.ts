'use server'

import { registerGymOwner as registerGymOwnerInService } from '@/lib/auth/onboarding'
import { ownerRegistrationSchema } from '@/lib/utils/validation'

export type RegisterGymOwnerActionState = {
    success?: true
    error?: string
}

export async function registerGymOwner(input: {
    name: string
    email: string
    password: string
    gym_name: string
}): Promise<RegisterGymOwnerActionState> {
    const parsed = ownerRegistrationSchema.safeParse(input)

    if (!parsed.success) {
        return {
            error: parsed.error.issues[0]?.message ?? 'Please check the highlighted fields and try again.',
        }
    }

    const result = await registerGymOwnerInService({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        gymName: parsed.data.gym_name,
    })

    if ('error' in result) {
        return { error: result.error }
    }

    return { success: true }
}

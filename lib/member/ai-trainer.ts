import 'server-only'

import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { gymHasFeature } from '@/lib/gym/features'

/**
 * Who may call the AI-trainer actions (plan generation, coach chat).
 *
 * The UI already hides these behind the gym's `ai_trainer` feature, but a
 * server action is a public endpoint, so the same check runs here. Returns
 * the user id to key rows by, or a member-facing reason it is off.
 */
export async function requireAiTrainer(): Promise<
    { userId: string } | { error: string }
> {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.member || !viewer.gym) return { error: 'Not authenticated' }

    const enabled = await gymHasFeature(viewer.gym.id, 'ai_trainer')
    if (!enabled) return { error: 'The AI trainer is not available at this gym.' }

    return { userId: viewer.user.id }
}

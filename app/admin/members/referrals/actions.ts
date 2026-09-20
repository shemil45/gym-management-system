'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { cancelReferralLead } from '@/lib/referrals/server'

export type CancelLeadActionResult = { success: true } | { error: string }

/** Staff-only. The gym comes from the viewer's context, never the form. */
export async function cancelLead(leadId: string): Promise<CancelLeadActionResult> {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to manage referrals.' }
    }
    if (typeof leadId !== 'string' || !leadId) return { error: 'Referral not found.' }

    const result = await cancelReferralLead(viewer.gym.id, leadId, viewer.user.id)
    if (!result.ok) {
        return { error: result.reason === 'not-found' ? 'Referral not found.' : 'Only a pending referral can be cancelled.' }
    }
    revalidatePath('/admin/members/referrals')
    revalidatePath('/admin/members')
    return { success: true }
}

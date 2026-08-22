'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentMemberContext } from '@/lib/auth/member-server'

export type UpdateProfileResult = { ok: true } | { ok: false; error: string }

/**
 * Members may edit their own contact details. Everything that affects billing or
 * access (plan, dates, status, member code) stays with gym staff.
 */
export async function updateMemberContactDetails(
    formData: FormData,
): Promise<UpdateProfileResult> {
    const context = await getCurrentMemberContext()
    if (!context.user || !context.member || !context.gym) {
        return { ok: false, error: 'You are not signed in as a member.' }
    }

    const phone = String(formData.get('phone') ?? '').trim()
    if (phone.replace(/\D/g, '').length < 8) {
        return { ok: false, error: 'Enter a valid phone number.' }
    }

    const payload = {
        phone,
        address: String(formData.get('address') ?? '').trim() || null,
        emergency_contact_name:
            String(formData.get('emergency_contact_name') ?? '').trim() || null,
        emergency_contact_phone:
            String(formData.get('emergency_contact_phone') ?? '').trim() || null,
    }

    const { error } = await getSupabaseAdmin()
        .from('members')
        .update(payload)
        .eq('id', context.member.id)
        .eq('gym_id', context.gym.id)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/member/profile')
    revalidatePath('/member/account')
    return { ok: true }
}

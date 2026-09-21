'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { UpdateTables } from '@/lib/types'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getActiveImpersonation, IMPERSONATION_READONLY_MESSAGE } from '@/lib/platform/impersonation-ledger'

const MAX_REFERRAL_BONUS_COINS = 100000

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

export async function updateReferralSettings(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }
    if (await getActiveImpersonation(viewer.gym.id)) return { error: IMPERSONATION_READONLY_MESSAGE }

    const enabled = formData.get('referrals_enabled') === 'true'
    const bonusValue = (formData.get('referral_bonus_coins') as string | null)?.trim()
    const bonus = Number(bonusValue)
    if (!bonusValue || !Number.isInteger(bonus) || bonus < 0 || bonus > MAX_REFERRAL_BONUS_COINS) {
        return { error: `Coins per referral must be a whole number between 0 and ${MAX_REFERRAL_BONUS_COINS.toLocaleString('en-IN')}.` }
    }

    const supabase = await createClient()
    const { data: updated, error } = await supabase
        .from('gyms')
        .update(({ referrals_enabled: enabled, referral_bonus_coins: bonus } satisfies UpdateTables<'gyms'>) as never)
        .eq('id', viewer.gym.id)
        .select('id')
        .maybeSingle()

    if (error) return { error: getErrorMessage(error, 'Failed to update referral settings') }
    if (!updated) return { error: 'Settings could not be saved — please refresh and try again.' }

    // The toggle changes what the members page, Add Member and the report show.
    revalidatePath('/admin', 'layout')
    revalidatePath('/member', 'layout')
    return { success: true }
}

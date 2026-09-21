import { redirect } from 'next/navigation'
import ReferralSettings from '@/components/settings/ReferralSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { getGymFeatureState } from '@/lib/gym/features'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { DEFAULT_REFERRER_BONUS_COINS } from '@/lib/payments/settle-member-payment'

export const metadata = { title: 'Referral settings' }

export default async function ReferralSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()
    if (!user) redirect('/admin/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member')

    const [{ data }, featureState] = await Promise.all([
        getSupabaseAdmin().from('gyms').select('referrals_enabled, referral_bonus_coins').eq('id', gym.id).maybeSingle(),
        getGymFeatureState(gym.id),
    ])
    const row = data as { referrals_enabled: boolean | null; referral_bonus_coins: number | null } | null

    return (
        <ReferralSettings
            gym={{
                referrals_enabled: row?.referrals_enabled ?? true,
                referral_bonus_coins: row?.referral_bonus_coins ?? DEFAULT_REFERRER_BONUS_COINS,
            }}
            available={featureState.referralsAvailable}
            onboardingComplete={featureState.onboardingComplete}
        />
    )
}

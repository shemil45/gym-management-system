import { redirect } from 'next/navigation'
import MembershipFeesSettings from '@/components/settings/MembershipFeesSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type GymFeeSettings = Pick<Tables<'gyms'>, 'default_admission_fee' | 'allow_admission_fee_waiver' | 'allow_custom_membership_start_date'>

export default async function MembershipFeesSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/admin/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('default_admission_fee, allow_admission_fee_waiver, allow_custom_membership_start_date')
        .eq('id', gym.id)
        .single()
    const { data: gymSettings } = gymResult as unknown as QueryResult<GymFeeSettings | null>

    return (
        <MembershipFeesSettings
            gym={{
                default_admission_fee: gymSettings?.default_admission_fee ?? 0,
                allow_admission_fee_waiver: gymSettings?.allow_admission_fee_waiver ?? true,
                allow_custom_membership_start_date: gymSettings?.allow_custom_membership_start_date ?? false,
            }}
        />
    )
}

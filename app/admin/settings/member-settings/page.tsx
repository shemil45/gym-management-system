import { redirect } from 'next/navigation'
import MemberIdSettings from '@/components/settings/MemberIdSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type GymMemberIdSettings = Pick<Tables<'gyms'>, 'member_id_prefix' | 'member_id_next_number' | 'member_id_padding'>

export default async function MemberSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/admin/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('member_id_prefix, member_id_next_number, member_id_padding')
        .eq('id', gym.id)
        .single()
    const { data: gymSettings } = gymResult as unknown as QueryResult<GymMemberIdSettings | null>

    return (
        <MemberIdSettings
            gym={{
                member_id_prefix: gymSettings?.member_id_prefix ?? 'GYM',
                member_id_next_number: gymSettings?.member_id_next_number ?? 1,
                member_id_padding: gymSettings?.member_id_padding ?? 3,
            }}
        />
    )
}

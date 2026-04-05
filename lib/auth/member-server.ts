import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import type { ProfileRole } from '@/lib/auth/roles'

type MemberProfile = {
    role: ProfileRole
    full_name: string
    photo_url: string | null
}

type MemberRecord = {
    id: string
    member_id: string
    membership_plan_id: string | null
    membership_expiry_date: string | null
    status: string
    referral_coins_balance: number
}

export const getCurrentMemberContext = cache(async () => {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return {
            member: null,
            profile: null,
            user: null,
        }
    }

    const [profileResult, memberResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('role, full_name, photo_url')
            .eq('id', user.id)
            .single(),
        supabase
            .from('members')
            .select('id, member_id, membership_plan_id, membership_expiry_date, status, referral_coins_balance')
            .eq('user_id', user.id)
            .single(),
    ])

    const { data: profile } = profileResult as unknown as QueryResult<MemberProfile | null>
    const { data: member } = memberResult as unknown as QueryResult<MemberRecord | null>

    return {
        member,
        profile,
        user,
    }
})

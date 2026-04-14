'use server'

import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { QueryResult } from '@/lib/types'

export interface ReferralRow {
    id: string
    status: 'pending' | 'applied' | 'expired'
    created_at: string
    referred_name: string
}

export interface ReferralPageData {
    referralCode: string
    memberId: string
    fullName: string
    stats: {
        total: number
        successful: number
        pending: number
        totalCoinsEarned: number
        availableCoins: number
    }
    referrals: ReferralRow[]
}

export async function fetchMemberReferrals(): Promise<ReferralPageData | null> {
    const viewer = await getCurrentGymContext()
    if (!viewer.member || !viewer.gym) return null

    const admin = getSupabaseAdmin()

    const memberWithCoinsResult = await admin
        .from('members')
        .select('id, member_id, full_name, referral_coins_balance')
        .eq('id', viewer.member.id)
        .eq('gym_id', viewer.gym.id)
        .single()

    let member: { id: string; member_id: string; full_name: string; referral_coins_balance?: number } | null =
        (memberWithCoinsResult as unknown as QueryResult<{
            id: string
            member_id: string
            full_name: string
            referral_coins_balance?: number
        } | null>).data

    // Fallback for environments where the referral coins migration has not been applied yet.
    if (!member) {
        const memberFallbackResult = await admin
            .from('members')
            .select('id, member_id, full_name')
            .eq('id', viewer.member.id)
            .eq('gym_id', viewer.gym.id)
            .single()

        member = (memberFallbackResult as unknown as QueryResult<{
            id: string
            member_id: string
            full_name: string
        } | null>).data
    }

    if (!member) return null

    // Fetch referrals with the referred member's name (admin bypasses RLS on the join)
    const referralsResult = await admin
        .from('referrals')
        .select(`
            id, status, created_at,
            referred:members!referrals_referred_id_fkey(full_name)
        `)
        .eq('gym_id', viewer.gym.id)
        .eq('referrer_id', member.id)
        .order('created_at', { ascending: false })

    const { data: referrals } = referralsResult as unknown as QueryResult<{
        id: string
        status: 'pending' | 'applied' | 'expired'
        created_at: string
        referred: { full_name: string } | null
    }[] | null>

    const refs = referrals || []
    const totalCoinsEarned = refs.filter(r => r.status === 'applied').length * 500
    const availableCoins = typeof member.referral_coins_balance === 'number'
        ? member.referral_coins_balance
        : totalCoinsEarned

    return {
        referralCode: member.member_id.toUpperCase(),
        memberId: member.member_id,
        fullName: member.full_name,
        stats: {
            total: refs.length,
            successful: refs.filter(r => r.status === 'applied').length,
            pending: refs.filter(r => r.status === 'pending').length,
            totalCoinsEarned,
            availableCoins,
        },
        referrals: refs.map(r => ({
            id: r.id,
            referred_name: r.referred?.full_name || 'Unknown',
            created_at: r.created_at,
            status: r.status,
        })),
    }
}

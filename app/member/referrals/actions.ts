'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export interface ReferralRow {
    id: string
    status: 'pending' | 'applied' | 'expired'
    reward_type: string | null
    reward_amount: number | null
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
        totalRewardsEarned: number
    }
    referrals: ReferralRow[]
}

export async function fetchMemberReferrals(): Promise<ReferralPageData | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Use admin client to bypass RLS for cross-member joins
    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the current user's member row
    const { data: member } = await admin
        .from('members')
        .select('id, member_id, full_name')
        .eq('user_id', user.id)
        .single() as { data: { id: string; member_id: string; full_name: string } | null, error: unknown }

    if (!member) return null

    // Fetch referrals with the referred member's name (admin bypasses RLS on the join)
    const { data: referrals } = await admin
        .from('referrals')
        .select(`
            id, status, reward_type, reward_amount, created_at,
            referred:members!referrals_referred_id_fkey(full_name)
        `)
        .eq('referrer_id', member.id)
        .order('created_at', { ascending: false }) as {
            data: {
                id: string
                status: 'pending' | 'applied' | 'expired'
                reward_type: string | null
                reward_amount: number | null
                created_at: string
                referred: { full_name: string } | null
            }[] | null,
            error: unknown
        }

    const refs = referrals || []

    return {
        referralCode: member.member_id.toUpperCase(),
        memberId: member.member_id,
        fullName: member.full_name,
        stats: {
            total: refs.length,
            successful: refs.filter(r => r.status === 'applied').length,
            pending: refs.filter(r => r.status === 'pending').length,
            totalRewardsEarned: refs
                .filter(r => r.status === 'applied' && r.reward_amount)
                .reduce((s, r) => s + (r.reward_amount || 0), 0),
        },
        referrals: refs.map(r => ({
            id: r.id,
            referred_name: r.referred?.full_name || 'Unknown',
            created_at: r.created_at,
            status: r.status,
            reward_type: r.reward_type,
            reward_amount: r.reward_amount,
        })),
    }
}

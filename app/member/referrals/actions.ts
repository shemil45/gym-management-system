'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Use admin client to bypass RLS for cross-member joins
    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the current user's member row
    const memberWithCoinsResult = await admin
        .from('members')
        .select('id, member_id, full_name, referral_coins_balance')
        .eq('user_id', user.id)
        .single()

    let member: { id: string; member_id: string; full_name: string; referral_coins_balance?: number } | null =
        memberWithCoinsResult.data as { id: string; member_id: string; full_name: string; referral_coins_balance?: number } | null

    // Fallback for environments where the referral coins migration has not been applied yet.
    if (!member) {
        const memberFallbackResult = await admin
            .from('members')
            .select('id, member_id, full_name')
            .eq('user_id', user.id)
            .single()

        member = memberFallbackResult.data as { id: string; member_id: string; full_name: string } | null
    }

    if (!member) return null

    // Fetch referrals with the referred member's name (admin bypasses RLS on the join)
    const { data: referrals } = await admin
        .from('referrals')
        .select(`
            id, status, created_at,
            referred:members!referrals_referred_id_fkey(full_name)
        `)
        .eq('referrer_id', member.id)
        .order('created_at', { ascending: false }) as {
            data: {
                id: string
                status: 'pending' | 'applied' | 'expired'
                created_at: string
                referred: { full_name: string } | null
            }[] | null,
            error: unknown
        }

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

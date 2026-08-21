import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getMemberPortalData } from '@/lib/member/portal-data'
import ReferralsClient from './ReferralsClient'

export const metadata = { title: 'Refer a friend' }

export default async function ReferralsPage() {
    const data = await getMemberPortalData()
    if (!data) redirect('/member')

    // Admin client so the join onto the referred member's name is not blocked by RLS.
    const { data: rows } = (await getSupabaseAdmin()
        .from('referrals')
        .select('status, created_at, referred:members!referrals_referred_id_fkey(full_name)')
        .eq('referrer_id', data.member.id)
        .order('created_at', { ascending: false })
        .limit(20)) as {
        data:
            | { status: string | null; created_at: string; referred: { full_name: string } | null }[]
            | null
    }

    const referrals = (rows ?? []).map((row) => ({
        name: row.referred?.full_name ?? 'New member',
        joinedAt: row.created_at,
        status: row.status ?? 'pending',
    }))

    return (
        <ReferralsClient
            code={data.member.memberCode}
            credits={data.credits}
            gymName={data.gym.name}
            referrals={referrals}
        />
    )
}

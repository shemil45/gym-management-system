import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { getOrCreateReferralLink } from '@/lib/referrals/server'
import { effectiveReferralStatus, type ReferralStatus } from '@/lib/referrals/lead'
import ReferralsClient from './ReferralsClient'

export const metadata = { title: 'Refer a friend' }

export default async function ReferralsPage() {
    const data = await getMemberPortalData()
    if (!data) redirect('/member')
    // The program is off for this gym (plan, platform override, or
    // onboarding): the entry rows are hidden, so a direct hit goes back to
    // where those rows would have been.
    if (!data.referralsEnabled) redirect('/member/account')

    // The share link is issued on first visit; the token lives on the
    // member's own row, scoped to their gym.
    const link = await getOrCreateReferralLink(data.member.id, data.gym.id)

    // Admin client so the join onto the referred member's name is not blocked by RLS.
    const { data: rows } = (await getSupabaseAdmin()
        .from('referrals')
        .select('status, created_at, submitted_at, expires_at, referred_id, referred_name, referred:members!referrals_referred_id_fkey(full_name)')
        .eq('referrer_id', data.member.id)
        .eq('gym_id', data.gym.id)
        .order('created_at', { ascending: false })
        .limit(20)) as {
        data:
            | {
                  status: ReferralStatus
                  created_at: string
                  submitted_at: string | null
                  expires_at: string | null
                  referred_id: string | null
                  referred_name: string | null
                  referred: { full_name: string } | null
              }[]
            | null
    }

    const referrals = (rows ?? []).map((row) => ({
        name: row.referred?.full_name ?? row.referred_name ?? 'New member',
        at: row.submitted_at ?? row.created_at,
        status: effectiveReferralStatus(row),
    }))

    return (
        <ReferralsClient
            code={data.member.memberCode}
            link={link?.url ?? null}
            credits={data.credits}
            gymName={data.gym.name}
            referrals={referrals}
        />
    )
}

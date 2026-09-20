import { redirect } from 'next/navigation'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { listReferralLeads } from '@/lib/referrals/server'
import { getActiveImpersonation } from '@/lib/platform/impersonation-ledger'
import { markGymNotificationsReadForReferral } from '@/app/admin/notifications/actions'
import ReferralLeadsTable from '@/components/referrals/ReferralLeadsTable'
import ReferralsOff from '@/components/reports/referrals/ReferralsOff'

export const metadata = { title: 'Referral leads' }

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ lead?: string; status?: string }> }

/**
 * Leads that came in through members' share links, newest first, with the
 * one action that matters: Complete Registration, which opens the normal
 * Add Member form pre-filled. Everything is scoped to the viewer's gym.
 */
export default async function ReferralLeadsPage({ searchParams }: Props) {
    const { gym, isStaff } = await getCurrentAdminContext()
    if (!gym || !isStaff) redirect('/admin/members')

    if (!(await gymHasFeature(gym.id, 'referrals'))) return <ReferralsOff />

    const params = await searchParams
    const [leads, impersonation] = await Promise.all([listReferralLeads(gym.id), getActiveImpersonation(gym.id)])

    // Arriving from the bell marks that lead's notification read.
    const highlight = params.lead && leads.some((lead) => lead.id === params.lead) ? params.lead : null
    if (highlight) await markGymNotificationsReadForReferral(highlight)

    return (
        <ReferralLeadsTable
            leads={leads}
            highlightId={highlight}
            initialStatus={params.status}
            readOnly={Boolean(impersonation)}
        />
    )
}

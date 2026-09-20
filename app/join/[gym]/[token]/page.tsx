import type { Metadata } from 'next'
import { resolveReferralLink, recordReferralLinkVisit } from '@/lib/referrals/server'
import { REFERRAL_LEAD_VALIDITY_DAYS } from '@/lib/referrals/lead'
import ReferralLeadForm from '@/components/referrals/ReferralLeadForm'
import { submitLead } from './actions'

type Params = Promise<{ gym: string; token: string }>
type Search = Promise<{ done?: string }>

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { gym, token } = await params
    const link = await resolveReferralLink(gym, token)
    return { title: link.ok ? `Join ${link.context.gym.name}` : 'Referral link' }
}

/**
 * Referral landing page. The token is resolved server-side to one gym and
 * one referring member; the visitor only ever sees the gym's name and the
 * referrer's first name, and the form posts nothing that identifies either.
 */
export default async function JoinPage({ params, searchParams }: { params: Params; searchParams: Search }) {
    const [{ gym, token }, { done }] = await Promise.all([params, searchParams])
    const link = await resolveReferralLink(gym, token)

    if (!link.ok) return <InvalidLink reason={link.reason} />

    // `?done=` is set by the form after a submission so a refresh stays on
    // the confirmation. It reveals nothing: the details are already saved.
    const initialOutcome = done === '1' ? 'submitted' : done === 'member' ? 'already-member' : null
    if (!initialOutcome) await recordReferralLinkVisit(link.context.referrer.id)
    const referrerFirstName = link.context.referrer.fullName.trim().split(/\s+/)[0] || 'A member'
    const action = submitLead.bind(null, gym, token)

    return (
        <ReferralLeadForm
            gymName={link.context.gym.name}
            gymLogoUrl={link.context.gym.logoUrl}
            referrerFirstName={referrerFirstName}
            validityDays={REFERRAL_LEAD_VALIDITY_DAYS}
            initialOutcome={initialOutcome}
            action={action}
        />
    )
}

function InvalidLink({ reason }: { reason: 'not-found' | 'program-off' | 'referrer-inactive' }) {
    const copy = {
        'not-found': {
            title: 'This referral link is not valid',
            body: 'Check the link you were sent, or ask your friend to share it again.',
        },
        'program-off': {
            title: 'Referrals are paused at this gym',
            body: 'You can still join: visit the gym and the front desk will register you.',
        },
        'referrer-inactive': {
            title: 'This referral link is no longer active',
            body: 'The member who shared it does not have an active membership right now. You are still welcome to visit the gym to join.',
        },
    }[reason]

    return (
        <div className="w-full max-w-100 rounded-xl border border-[#c6c6cd] bg-white p-6 text-center shadow-[0px_4px_6px_rgba(15,23,42,0.05)] sm:p-8 dark:border-[#27272a] dark:bg-[#0e0e11]">
            <h1 className="text-xl font-bold tracking-[-0.02em] text-[#191c1e] dark:text-white">{copy.title}</h1>
            <p className="mt-2 text-sm text-[#45464d] dark:text-[#cfc4c5]/70">{copy.body}</p>
        </div>
    )
}

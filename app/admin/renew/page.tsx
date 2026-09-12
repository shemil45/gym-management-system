import { redirect } from 'next/navigation'
import RenewSubscriptionView from '@/components/billing/RenewSubscriptionView'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSubscriptionView } from '@/lib/billing/subscription'

export const metadata = { title: 'Renew your subscription' }
/** Never cached: whether this page should exist at all depends on today's date. */
export const dynamic = 'force-dynamic'

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@gmscloud.app'

/**
 * Where the gated sections send a lapsed tenant. A tenant whose plan is live
 * has no business here, so the page bounces them rather than showing a
 * warning that is not true.
 */
export default async function RenewSubscriptionPage() {
    const { gym } = await getCurrentGymContext()
    if (!gym) redirect('/admin/login')

    const view = await getSubscriptionView(gym.id)
    if (!view.isLapsed) redirect('/admin/dashboard')

    return (
        <RenewSubscriptionView
            state={view.state}
            gymName={gym.name}
            planName={view.plan?.name ?? null}
            lapsedOn={view.effectiveUntil}
            supportEmail={SUPPORT_EMAIL}
        />
    )
}

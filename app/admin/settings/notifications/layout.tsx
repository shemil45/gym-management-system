import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { requireActiveSubscription } from '@/lib/billing/gate'

/** Closed while the subscription is lapsed - see lib/billing/gate.ts. */
export default async function GatedLayout({ children }: { children: React.ReactNode }) {
    const { gym } = await getCurrentGymContext()
    if (gym) await requireActiveSubscription(gym.id)
    return <>{children}</>
}

import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { redirectIfLapsed } from '@/lib/billing/gate'

/**
 * Soft-navigation gate. Full loads are caught earlier by the admin layout;
 * this catches dashboard -> here, where shared layouts do not re-render.
 */
export default async function GatedLayout({ children }: { children: React.ReactNode }) {
    const { gym } = await getCurrentGymContext()
    if (gym) await redirectIfLapsed(gym.id)
    return <>{children}</>
}

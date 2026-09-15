import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import ReportsLocked from '@/components/reports/ReportsLocked'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
    const { gym } = await getCurrentAdminContext()
    // The admin layout already redirects viewers without a gym; this is belt and braces.
    if (!gym) return null

    const enabled = await gymHasFeature(gym.id, 'advanced_reports')
    if (!enabled) return <ReportsLocked gymName={gym.name} />

    return <>{children}</>
}

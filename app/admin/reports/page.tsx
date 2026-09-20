import { Suspense } from 'react'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { getLandingStats, landingStatLabel, type LandingArea } from '@/lib/reports/landing-stats'
import ReportsLanding, { REPORT_AREAS } from '@/components/reports/ReportsLanding'

// The five stat components share one `getLandingStats` promise (React-cached
// per request), so they cost a single batch of counts between them and all
// resolve together.
async function AreaStat({ gymId, area }: { gymId: string; area: LandingArea }) {
    const label = landingStatLabel(area, await getLandingStats(gymId))
    return label ? <span>{label}</span> : null
}

function StatPlaceholder() {
    return <span className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-neutral-800" aria-hidden="true" />
}

export default async function ReportsPage() {
    const { gym } = await getCurrentAdminContext()
    // The reports layout already handles the no-gym case; this is belt and braces.
    if (!gym) return <ReportsLanding />

    const stats = Object.fromEntries(REPORT_AREAS.map((area) => [
        area.id,
        <Suspense key={area.id} fallback={<StatPlaceholder />}>
            <AreaStat gymId={gym.id} area={area.id as LandingArea} />
        </Suspense>,
    ]))

    return <ReportsLanding stats={stats} />
}

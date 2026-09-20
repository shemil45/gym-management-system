import { Suspense } from 'react'
import { ReportBody, ReportNavigationProvider } from '@/components/reports/ReportNavigation'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { todayInKolkata } from '@/lib/reports/dates'
import { parseReferralsParams, referralsSearchParams, type ReferralsReportQuery, type RawParams } from '@/lib/reports/referrals-params'
import { getLeaderboard, getOverview, getReferralList } from '@/lib/reports/referrals'
import ReferralsReport from '@/components/reports/referrals/ReferralsReport'
import ReferralsOff from '@/components/reports/referrals/ReferralsOff'
import OverviewKpis from '@/components/reports/referrals/OverviewKpis'
import OverviewAnalytics from '@/components/reports/referrals/OverviewAnalytics'
import OverviewTable from '@/components/reports/referrals/OverviewTable'
import LeaderboardAnalytics from '@/components/reports/referrals/LeaderboardAnalytics'
import LeaderboardTable from '@/components/reports/referrals/LeaderboardTable'
import ReferralListTable from '@/components/reports/referrals/ReferralListTable'
import StatusChips from '@/components/reports/referrals/StatusChips'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ComparisonControl from '@/components/reports/ComparisonControl'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import PrintButton from '@/components/reports/PrintButton'
import { ReferralsTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/referrals'

// Each tab still makes exactly the fetches it made before this analytics
// layer existed (the Overview skips its comparison fetches when comparison is
// off); KPIs, charts, insight and table are views of one report object.
async function TabBody({ gymId, query }: { gymId: string; query: ReferralsReportQuery }) {
    switch (query.tab) {
        case 'overview': {
            const report = await getOverview(gymId, query)
            return <><OverviewKpis report={report} /><OverviewAnalytics report={report} /><OverviewTable report={report} /></>
        }
        case 'leaderboard': {
            const report = await getLeaderboard(gymId, query)
            return <><LeaderboardAnalytics report={report} /><LeaderboardTable report={report} /></>
        }
        case 'list':
            return <ReferralListTable report={await getReferralList(gymId, query)} />
    }
}

function controlsFor(query: ReferralsReportQuery, search: string) {
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`
    const actions = <div className="flex gap-2"><PrintButton /><ExportCsvButton search={search} basePath={BASE} /></div>
    // Only the Overview compares periods: the Leaderboard would need a second
    // referrals fetch for per-referrer deltas, and the list is operational.
    // "Last year" stays hidden: knowing whether referrals reach that far back
    // would take a query this page does not otherwise need.
    switch (query.tab) {
        case 'overview':
            return (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <PeriodPicker key={periodKey} query={query} basePath={BASE} />
                        <ComparisonControl value={query.compare} basePath={BASE} allowLastYear={false} />
                    </div>
                    {actions}
                </>
            )
        case 'leaderboard':
            return <><PeriodPicker key={periodKey} query={query} basePath={BASE} />{actions}</>
        case 'list':
            return <><div className="flex flex-wrap items-center gap-2"><PeriodPicker key={periodKey} query={query} basePath={BASE} /><StatusChips query={query} /></div>{actions}</>
    }
}

export default async function ReferralsReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    if (!(await gymHasFeature(gym.id, 'referrals'))) return <ReferralsOff />

    const query = parseReferralsParams(await searchParams, todayInKolkata())
    const search = referralsSearchParams(query).toString()

    return (
        <ReportNavigationProvider area="referrals" activeTab={query.tab}>
            <ReferralsReport query={query} gymName={gym.name} controls={controlsFor(query, search)}>
                {/* Keyed on the full query so a tab, status, or period change
                    swaps the body for its skeleton instead of holding stale data. */}
                <ReportBody>
                    <Suspense key={search} fallback={<div className="space-y-5 animate-pulse"><ReferralsTabSkeleton tab={query.tab} /></div>}>
                        <TabBody gymId={gym.id} query={query} />
                    </Suspense>
                </ReportBody>
            </ReferralsReport>
        </ReportNavigationProvider>
    )
}

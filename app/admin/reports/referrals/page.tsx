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
import OverviewTable from '@/components/reports/referrals/OverviewTable'
import LeaderboardTable from '@/components/reports/referrals/LeaderboardTable'
import ReferralListTable from '@/components/reports/referrals/ReferralListTable'
import StatusChips from '@/components/reports/referrals/StatusChips'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import { ReferralsTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/referrals'

async function TabBody({ gymId, query }: { gymId: string; query: ReferralsReportQuery }) {
    switch (query.tab) {
        case 'overview': {
            const report = await getOverview(gymId, query)
            return <><OverviewKpis current={report.kpis} previous={report.previous} outstanding={report.outstanding} /><OverviewTable report={report} /></>
        }
        case 'leaderboard':
            return <LeaderboardTable report={await getLeaderboard(gymId, query)} />
        case 'list':
            return <ReferralListTable report={await getReferralList(gymId, query)} />
    }
}

function controlsFor(query: ReferralsReportQuery, search: string) {
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`
    switch (query.tab) {
        case 'overview':
        case 'leaderboard':
            return <><PeriodPicker key={periodKey} query={query} basePath={BASE} /><ExportCsvButton search={search} basePath={BASE} /></>
        case 'list':
            return <><PeriodPicker key={periodKey} query={query} basePath={BASE} /><StatusChips query={query} /><ExportCsvButton search={search} basePath={BASE} /></>
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
            <ReferralsReport query={query} controls={controlsFor(query, search)}>
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

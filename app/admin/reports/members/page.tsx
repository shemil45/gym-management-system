import { Suspense } from 'react'
import { ReportBody, ReportNavigationProvider } from '@/components/reports/ReportNavigation'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { membersSearchParams, parseMembersParams, type MembersReportQuery, type RawParams } from '@/lib/reports/members-params'
import { getInactive, getJoins, getRenewals, getRetention, getRoster } from '@/lib/reports/members'
import MembersReport from '@/components/reports/members/MembersReport'
import JoinsTable from '@/components/reports/members/JoinsTable'
import JoinsKpis from '@/components/reports/members/JoinsKpis'
import JoinsAnalytics from '@/components/reports/members/JoinsAnalytics'
import RenewalsTable from '@/components/reports/members/RenewalsTable'
import RenewalsControls from '@/components/reports/members/RenewalsControls'
import RenewalsSummary from '@/components/reports/members/RenewalsSummary'
import RetentionTable from '@/components/reports/members/RetentionTable'
import RetentionKpis from '@/components/reports/members/RetentionKpis'
import RetentionAnalytics from '@/components/reports/members/RetentionAnalytics'
import ChurnedTable from '@/components/reports/members/ChurnedTable'
import RosterCards from '@/components/reports/members/RosterCards'
import RosterAnalytics from '@/components/reports/members/RosterAnalytics'
import PlanDistributionTable from '@/components/reports/members/PlanDistributionTable'
import InactiveTable from '@/components/reports/members/InactiveTable'
import InactiveAnalytics from '@/components/reports/members/InactiveAnalytics'
import DaysChips from '@/components/reports/members/DaysChips'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ComparisonControl from '@/components/reports/ComparisonControl'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import PrintButton from '@/components/reports/PrintButton'
import { MembersTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/members'

// Each tab still makes exactly the fetches it made before this analytics
// layer existed; KPIs, charts, insight and tables are views of one report
// object built from those rows, so they reconcile by construction.
async function TabBody({ gymId, query }: { gymId: string; query: MembersReportQuery }) {
    switch (query.tab) {
        case 'joins': {
            const report = await getJoins(gymId, query)
            return <><JoinsKpis report={report} /><JoinsAnalytics report={report} /><JoinsTable report={report} /></>
        }
        case 'renewals': {
            const report = await getRenewals(gymId, query)
            return <><RenewalsSummary report={report} /><RenewalsTable report={report} /></>
        }
        case 'retention': {
            const report = await getRetention(gymId, query)
            return <><RetentionKpis report={report} /><RetentionAnalytics report={report} /><RetentionTable report={report} /><ChurnedTable rows={report.churned} /></>
        }
        case 'roster': {
            const report = await getRoster(gymId, query.today)
            return <><RosterAnalytics report={report} /><RosterCards report={report} /><PlanDistributionTable plans={report.plans} /></>
        }
        case 'inactive': {
            const report = await getInactive(gymId, query)
            return <><InactiveAnalytics report={report} /><InactiveTable report={report} /></>
        }
    }
}

function controlsFor(query: MembersReportQuery, search: string) {
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`
    const actions = <div className="flex gap-2"><PrintButton /><ExportCsvButton search={search} basePath={BASE} /></div>
    switch (query.tab) {
        // The two period tabs compare; the operational lists do not — a
        // renewals to-do or an inactive list has nothing to compare against.
        // "Last year" stays hidden: knowing whether records reach that far back
        // would take a query this page does not otherwise need.
        case 'joins':
        case 'retention':
            return (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <PeriodPicker key={periodKey} query={query} basePath={BASE} />
                        <ComparisonControl value={query.compare} basePath={BASE} allowLastYear={false} />
                    </div>
                    {actions}
                </>
            )
        case 'renewals':
            return (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <RenewalsControls query={query} />
                        {query.lapsed && <PeriodPicker key={periodKey} query={query} basePath={BASE} />}
                    </div>
                    {actions}
                </>
            )
        case 'roster':
            return actions
        case 'inactive':
            return <><DaysChips query={query} />{actions}</>
    }
}

export default async function MembersReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const query = parseMembersParams(await searchParams, todayInKolkata())
    const search = membersSearchParams(query).toString()

    return (
        <ReportNavigationProvider area="members" activeTab={query.tab}>
            <MembersReport query={query} gymName={gym.name} controls={controlsFor(query, search)}>
                {/* Keyed on the full query so a tab, horizon, days, or period change
                    swaps the body for its skeleton instead of holding stale data. */}
                <ReportBody>
                    <Suspense key={search} fallback={<div className="space-y-5 animate-pulse"><MembersTabSkeleton tab={query.tab} /></div>}>
                        <TabBody gymId={gym.id} query={query} />
                    </Suspense>
                </ReportBody>
            </MembersReport>
        </ReportNavigationProvider>
    )
}

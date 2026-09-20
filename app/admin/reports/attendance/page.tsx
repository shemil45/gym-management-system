import { Suspense } from 'react'
import { ReportBody, ReportNavigationProvider } from '@/components/reports/ReportNavigation'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { attendanceSearchParams, parseAttendanceParams, type AttendanceReportQuery, type RawParams } from '@/lib/reports/attendance-params'
import { getByMember, getFootfall, getHeatmap } from '@/lib/reports/attendance'
import AttendanceReport from '@/components/reports/attendance/AttendanceReport'
import FootfallKpis from '@/components/reports/attendance/FootfallKpis'
import FootfallAnalytics from '@/components/reports/attendance/FootfallAnalytics'
import FootfallTable from '@/components/reports/attendance/FootfallTable'
import ByMemberAnalytics from '@/components/reports/attendance/ByMemberAnalytics'
import ByMemberTable from '@/components/reports/attendance/ByMemberTable'
import SortChips from '@/components/reports/attendance/SortChips'
import HeatmapAnalytics from '@/components/reports/attendance/HeatmapAnalytics'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ComparisonControl from '@/components/reports/ComparisonControl'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import PrintButton from '@/components/reports/PrintButton'
import { AttendanceTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/attendance'

// Each tab still makes exactly the fetches it made before this analytics
// layer existed; KPIs, charts, insight and table are views of one report
// object built from those check-ins, so they reconcile by construction.
async function TabBody({ gymId, query }: { gymId: string; query: AttendanceReportQuery }) {
    switch (query.tab) {
        case 'footfall': {
            const report = await getFootfall(gymId, query)
            return <><FootfallKpis report={report} /><FootfallAnalytics report={report} /><FootfallTable report={report} /></>
        }
        case 'members': {
            const report = await getByMember(gymId, query)
            return <><ByMemberAnalytics report={report} /><ByMemberTable report={report} /></>
        }
        case 'heatmap':
            return <HeatmapAnalytics report={await getHeatmap(gymId, query)} />
    }
}

function controlsFor(query: AttendanceReportQuery, search: string) {
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`
    const actions = <div className="flex gap-2"><PrintButton /><ExportCsvButton search={search} basePath={BASE} /></div>
    // Only Footfall compares periods; By member is a list and the heat map a
    // single grid. "Last year" stays hidden: knowing whether check-ins reach
    // that far back would take a query this page does not otherwise need.
    switch (query.tab) {
        case 'footfall':
            return (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <PeriodPicker key={periodKey} query={query} basePath={BASE} />
                        <ComparisonControl value={query.compare} basePath={BASE} allowLastYear={false} />
                    </div>
                    {actions}
                </>
            )
        case 'members':
            return <><div className="flex flex-wrap items-center gap-2"><PeriodPicker key={periodKey} query={query} basePath={BASE} /><SortChips query={query} /></div>{actions}</>
        case 'heatmap':
            return <><PeriodPicker key={periodKey} query={query} basePath={BASE} />{actions}</>
    }
}

export default async function AttendanceReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const query = parseAttendanceParams(await searchParams, todayInKolkata())
    const search = attendanceSearchParams(query).toString()

    return (
        <ReportNavigationProvider area="attendance" activeTab={query.tab}>
            <AttendanceReport query={query} gymName={gym.name} controls={controlsFor(query, search)}>
                {/* Keyed on the full query so a tab, sort, or period change
                    swaps the body for its skeleton instead of holding stale data. */}
                <ReportBody>
                    <Suspense key={search} fallback={<div className="space-y-5 animate-pulse"><AttendanceTabSkeleton tab={query.tab} /></div>}>
                        <TabBody gymId={gym.id} query={query} />
                    </Suspense>
                </ReportBody>
            </AttendanceReport>
        </ReportNavigationProvider>
    )
}

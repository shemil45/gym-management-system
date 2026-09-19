import { Suspense } from 'react'
import { ReportBody, ReportNavigationProvider } from '@/components/reports/ReportNavigation'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { attendanceSearchParams, parseAttendanceParams, type AttendanceReportQuery, type RawParams } from '@/lib/reports/attendance-params'
import { getByMember, getFootfall, getHeatmap } from '@/lib/reports/attendance'
import AttendanceReport from '@/components/reports/attendance/AttendanceReport'
import FootfallKpis from '@/components/reports/attendance/FootfallKpis'
import FootfallTable from '@/components/reports/attendance/FootfallTable'
import ByMemberTable from '@/components/reports/attendance/ByMemberTable'
import SortChips from '@/components/reports/attendance/SortChips'
import HeatmapTable from '@/components/reports/attendance/HeatmapTable'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import { AttendanceTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/attendance'

async function TabBody({ gymId, query }: { gymId: string; query: AttendanceReportQuery }) {
    switch (query.tab) {
        case 'footfall': {
            const report = await getFootfall(gymId, query)
            return <><FootfallKpis current={report.kpis} previous={report.previous} /><FootfallTable report={report} /></>
        }
        case 'members':
            return <ByMemberTable report={await getByMember(gymId, query)} />
        case 'heatmap':
            return <HeatmapTable heatmap={await getHeatmap(gymId, query)} />
    }
}

function controlsFor(query: AttendanceReportQuery, search: string) {
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`
    switch (query.tab) {
        case 'footfall':
            return <><PeriodPicker key={periodKey} query={query} basePath={BASE} /><ExportCsvButton search={search} basePath={BASE} /></>
        case 'members':
            return <><PeriodPicker key={periodKey} query={query} basePath={BASE} /><SortChips query={query} /><ExportCsvButton search={search} basePath={BASE} /></>
        case 'heatmap':
            return <><PeriodPicker key={periodKey} query={query} basePath={BASE} /><ExportCsvButton search={search} basePath={BASE} /></>
    }
}

export default async function AttendanceReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const query = parseAttendanceParams(await searchParams, todayInKolkata())
    const search = attendanceSearchParams(query).toString()

    return (
        <ReportNavigationProvider area="attendance" activeTab={query.tab}>
            <AttendanceReport query={query} controls={controlsFor(query, search)}>
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

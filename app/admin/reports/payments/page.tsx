import { Suspense } from 'react'
import { ReportBody, ReportNavigationProvider } from '@/components/reports/ReportNavigation'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { parsePaymentsParams, toSearchParams, type PaymentsReportQuery, type RawParams } from '@/lib/reports/payments-params'
import { getByPlan, getByStaff, getDayBook, getPending, getPeriodSummary } from '@/lib/reports/payments'
import PaymentsReport from '@/components/reports/payments/PaymentsReport'
import DayBookTable from '@/components/reports/payments/DayBookTable'
import PrintButton from '@/components/reports/PrintButton'
import KpiStrip from '@/components/reports/payments/KpiStrip'
import SummaryAnalytics from '@/components/reports/payments/SummaryAnalytics'
import SummaryTable from '@/components/reports/payments/SummaryTable'
import PlanAnalytics from '@/components/reports/payments/PlanAnalytics'
import ByPlanTable from '@/components/reports/payments/ByPlanTable'
import PendingAnalytics from '@/components/reports/payments/PendingAnalytics'
import PendingTable from '@/components/reports/payments/PendingTable'
import StaffAnalytics from '@/components/reports/payments/StaffAnalytics'
import ByStaffTable from '@/components/reports/payments/ByStaffTable'
import DatePager from '@/components/reports/DatePager'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ComparisonControl from '@/components/reports/ComparisonControl'
import { PaymentsTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/payments'

// The data for one tab. Rendered inside a Suspense boundary so the shell
// (title, tab bar, controls) paints immediately and only this part streams.
//
// Every tab reads one report object built from one fetch of the selected
// range (plus one of the comparison range where a comparison is on). The
// KPI row, charts, insight and table of a tab are all views of that object,
// so they reconcile by construction.
async function TabBody({ gymId, gymName, today, query }: { gymId: string; gymName: string; today: string; query: PaymentsReportQuery }) {
    switch (query.tab) {
        case 'daybook': {
            const report = await getDayBook(gymId, query.date)
            return <DayBookTable report={report} date={query.date} gymName={gymName} />
        }
        case 'summary': {
            const report = await getPeriodSummary(gymId, query)
            return (
                <>
                    <KpiStrip report={report} />
                    <SummaryAnalytics report={report} />
                    <SummaryTable report={report} />
                </>
            )
        }
        case 'plans': {
            const report = await getByPlan(gymId, query)
            return <><PlanAnalytics report={report} /><ByPlanTable report={report} /></>
        }
        case 'pending': {
            const report = await getPending(gymId, query.range, today)
            return <><PendingAnalytics report={report} /><PendingTable report={report} /></>
        }
        case 'staff': {
            const report = await getByStaff(gymId, query.range)
            return <><StaffAnalytics report={report} /><ByStaffTable report={report} /></>
        }
    }
}

export default async function PaymentsReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const today = todayInKolkata()
    const query = parsePaymentsParams(await searchParams, today)
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`

    const controls = query.tab === 'daybook'
        ? (
            <>
                <DatePager query={query} basePath={BASE} today={today} />
                <div className="flex gap-2"><PrintButton /><ExportCsvButton search={toSearchParams(query).toString()} basePath={BASE} /></div>
            </>
        )
        : (
            <>
                <div className="flex flex-wrap items-center gap-2">
                    <PeriodPicker key={periodKey} query={query} basePath={BASE} />
                    {/* "Last year" stays hidden: knowing whether the gym has
                        records that far back would take a query this page
                        does not otherwise need. See lastYearIsAvailable. */}
                    <ComparisonControl value={query.compare} basePath={BASE} allowLastYear={false} />
                </div>
                <div className="flex gap-2"><PrintButton /><ExportCsvButton search={toSearchParams(query).toString()} basePath={BASE} /></div>
            </>
        )

    return (
        <ReportNavigationProvider area="payments" activeTab={query.tab}>
            <PaymentsReport query={query} gymName={gym.name} controls={controls}>
                {/* Keyed on the full query so a tab or period change swaps the body
                    for its skeleton instead of holding the stale table. */}
                <ReportBody>
                    <Suspense key={toSearchParams(query).toString()} fallback={<div className="space-y-5 animate-pulse"><PaymentsTabSkeleton tab={query.tab} /></div>}>
                        <TabBody gymId={gym.id} gymName={gym.name} today={today} query={query} />
                    </Suspense>
                </ReportBody>
            </PaymentsReport>
        </ReportNavigationProvider>
    )
}

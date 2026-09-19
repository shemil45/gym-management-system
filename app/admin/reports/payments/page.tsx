import { Suspense } from 'react'
import { ReportBody, ReportNavigationProvider } from '@/components/reports/ReportNavigation'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { parsePaymentsParams, toSearchParams, type PaymentsReportQuery, type RawParams } from '@/lib/reports/payments-params'
import { getByPlan, getByStaff, getDayBook, getPending, getPeriodSummary } from '@/lib/reports/payments'
import PaymentsReport from '@/components/reports/payments/PaymentsReport'
import DayBookTable from '@/components/reports/payments/DayBookTable'
import PrintButton from '@/components/reports/payments/PrintButton'
import KpiStrip from '@/components/reports/payments/KpiStrip'
import SummaryTable from '@/components/reports/payments/SummaryTable'
import ByPlanTable from '@/components/reports/payments/ByPlanTable'
import PendingTable from '@/components/reports/payments/PendingTable'
import ByStaffTable from '@/components/reports/payments/ByStaffTable'
import DatePager from '@/components/reports/DatePager'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import PeriodPicker from '@/components/reports/PeriodPicker'
import { PaymentsTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/payments'

// The data for one tab. Rendered inside a Suspense boundary so the shell
// (title, tab bar, controls) paints immediately and only this part streams.
async function TabBody({ gymId, gymName, query }: { gymId: string; gymName: string; query: PaymentsReportQuery }) {
    switch (query.tab) {
        case 'daybook': {
            const report = await getDayBook(gymId, query.date)
            return <DayBookTable report={report} date={query.date} gymName={gymName} />
        }
        case 'summary': {
            const report = await getPeriodSummary(gymId, query)
            return (
                <>
                    <KpiStrip current={report.kpis} previous={report.previous} />
                    <SummaryTable report={report} />
                </>
            )
        }
        case 'plans':
            return <ByPlanTable report={await getByPlan(gymId, query.range)} />
        case 'pending':
            return <PendingTable report={await getPending(gymId, query.range)} />
        case 'staff':
            return <ByStaffTable report={await getByStaff(gymId, query.range)} />
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
                <PeriodPicker key={periodKey} query={query} basePath={BASE} />
                <ExportCsvButton search={toSearchParams(query).toString()} basePath={BASE} />
            </>
        )

    return (
        <ReportNavigationProvider area="payments" activeTab={query.tab}>
            <PaymentsReport query={query} controls={controls}>
                {/* Keyed on the full query so a tab or period change swaps the body
                    for its skeleton instead of holding the stale table. */}
                <ReportBody>
                    <Suspense key={toSearchParams(query).toString()} fallback={<div className="space-y-5 animate-pulse"><PaymentsTabSkeleton tab={query.tab} /></div>}>
                        <TabBody gymId={gym.id} gymName={gym.name} query={query} />
                    </Suspense>
                </ReportBody>
            </PaymentsReport>
        </ReportNavigationProvider>
    )
}

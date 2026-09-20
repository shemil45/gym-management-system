import { Suspense } from 'react'
import { ReportBody, ReportNavigationProvider } from '@/components/reports/ReportNavigation'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { expensesSearchParams, parseExpensesParams, type ExpensesReportQuery, type RawParams } from '@/lib/reports/expenses-params'
import { getByCategory, getLedger, getPnl } from '@/lib/reports/expenses'
import ExpensesReport from '@/components/reports/expenses/ExpensesReport'
import PnlKpis from '@/components/reports/expenses/PnlKpis'
import PnlAnalytics from '@/components/reports/expenses/PnlAnalytics'
import PnlTable from '@/components/reports/expenses/PnlTable'
import CategoryAnalytics from '@/components/reports/expenses/CategoryAnalytics'
import ByCategoryTable from '@/components/reports/expenses/ByCategoryTable'
import LedgerTable from '@/components/reports/expenses/LedgerTable'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ComparisonControl from '@/components/reports/ComparisonControl'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import PrintButton from '@/components/reports/PrintButton'
import { ExpensesTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/expenses'

// Every tab reads one report object built from one fetch of the selected
// range (plus one of the comparison range where a comparison is on). KPIs,
// charts, insight and table are all views of that object, so they reconcile.
async function TabBody({ gymId, today, query }: { gymId: string; today: string; query: ExpensesReportQuery }) {
    switch (query.tab) {
        case 'pnl': {
            const report = await getPnl(gymId, query, today)
            return <><PnlKpis report={report} /><PnlAnalytics report={report} /><PnlTable report={report} /></>
        }
        case 'categories': {
            const report = await getByCategory(gymId, query)
            return <><CategoryAnalytics report={report} /><ByCategoryTable report={report} /></>
        }
        case 'ledger':
            return <LedgerTable report={await getLedger(gymId, query.range)} />
    }
}

export default async function ExpensesReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const today = todayInKolkata()
    const query = parseExpensesParams(await searchParams, today)
    const search = expensesSearchParams(query).toString()
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`

    // The ledger is a list, not a comparison, so it gets no comparison control.
    const controls = (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <PeriodPicker key={periodKey} query={query} basePath={BASE} />
                {/* "Last year" stays hidden: the report has nothing that says how far
                    back the gym's records go, and finding out would be a query this
                    page does not otherwise need. See lastYearIsAvailable. */}
                {query.tab !== 'ledger' && <ComparisonControl value={query.compare} basePath={BASE} allowLastYear={false} />}
            </div>
            <div className="flex gap-2"><PrintButton /><ExportCsvButton search={search} basePath={BASE} /></div>
        </>
    )

    return (
        <ReportNavigationProvider area="expenses" activeTab={query.tab}>
            <ExpensesReport query={query} gymName={gym.name} controls={controls}>
                <ReportBody>
                    <Suspense key={search} fallback={<div className="space-y-5 animate-pulse"><ExpensesTabSkeleton tab={query.tab} /></div>}>
                        <TabBody gymId={gym.id} today={today} query={query} />
                    </Suspense>
                </ReportBody>
            </ExpensesReport>
        </ReportNavigationProvider>
    )
}

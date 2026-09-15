import { Suspense } from 'react'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { parseExpensesParams, type ExpensesReportQuery, type RawParams } from '@/lib/reports/expenses-params'
import { periodSearchParams } from '@/lib/reports/period-params'
import { getByCategory, getLedger, getPnl } from '@/lib/reports/expenses'
import ExpensesReport from '@/components/reports/expenses/ExpensesReport'
import PnlKpis from '@/components/reports/expenses/PnlKpis'
import PnlTable from '@/components/reports/expenses/PnlTable'
import ByCategoryTable from '@/components/reports/expenses/ByCategoryTable'
import LedgerTable from '@/components/reports/expenses/LedgerTable'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import { ExpensesTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/expenses'

async function TabBody({ gymId, query }: { gymId: string; query: ExpensesReportQuery }) {
    switch (query.tab) {
        case 'pnl': {
            const report = await getPnl(gymId, query)
            return <><PnlKpis current={report.kpis} previous={report.previous} /><PnlTable report={report} /></>
        }
        case 'categories':
            return <ByCategoryTable report={await getByCategory(gymId, query)} />
        case 'ledger':
            return <LedgerTable report={await getLedger(gymId, query.range)} />
    }
}

export default async function ExpensesReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const query = parseExpensesParams(await searchParams, todayInKolkata())
    const search = periodSearchParams(query).toString()
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`

    return (
        <ExpensesReport
            query={query}
            controls={<><PeriodPicker key={periodKey} query={query} basePath={BASE} /><ExportCsvButton search={search} basePath={BASE} /></>}
        >
            <Suspense key={search} fallback={<div className="space-y-5 animate-pulse"><ExpensesTabSkeleton tab={query.tab} /></div>}>
                <TabBody gymId={gym.id} query={query} />
            </Suspense>
        </ExpensesReport>
    )
}

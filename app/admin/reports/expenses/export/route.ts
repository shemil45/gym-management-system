import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { todayInKolkata } from '@/lib/reports/dates'
import { expensesExportFilename, parseExpensesParams, type RawParams } from '@/lib/reports/expenses-params'
import { getByCategory, getLedger, getPnl } from '@/lib/reports/expenses'
import { categoryCsv, ledgerCsv, pnlCsv } from '@/lib/reports/expenses-csv'

export async function GET(request: Request) {
    const { user, gym, isStaff } = await getCurrentAdminContext()
    if (!user || !gym || !isStaff) return new Response('Unauthorized', { status: 401 })
    if (!(await gymHasFeature(gym.id, 'advanced_reports'))) return new Response('Advanced reports are not enabled for this gym', { status: 403 })

    const raw: RawParams = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = parseExpensesParams(raw, todayInKolkata())

    try {
        let csv: string
        switch (query.tab) {
            case 'pnl': csv = pnlCsv(await getPnl(gym.id, query)); break
            case 'categories': csv = categoryCsv(await getByCategory(gym.id, query)); break
            case 'ledger': csv = ledgerCsv(await getLedger(gym.id, query.range)); break
        }
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${expensesExportFilename(query)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[reports/expenses/export]', error)
        return new Response('Export failed', { status: 500 })
    }
}

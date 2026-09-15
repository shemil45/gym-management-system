import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { todayInKolkata } from '@/lib/reports/dates'
import { exportFilename, parsePaymentsParams, type RawParams } from '@/lib/reports/payments-params'
import { getByPlan, getByStaff, getDayBook, getPending, getPeriodSummary } from '@/lib/reports/payments'
import { dayBookCsv, pendingCsv, planCsv, staffCsv, summaryCsv } from '@/lib/reports/payments-csv'

export async function GET(request: Request) {
    const { user, gym, isStaff } = await getCurrentAdminContext()
    if (!user || !gym || !isStaff) return new Response('Unauthorized', { status: 401 })
    if (!(await gymHasFeature(gym.id, 'advanced_reports'))) return new Response('Advanced reports are not enabled for this gym', { status: 403 })

    const raw: RawParams = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = parsePaymentsParams(raw, todayInKolkata())

    try {
        let csv: string
        switch (query.tab) {
            case 'daybook': csv = dayBookCsv(await getDayBook(gym.id, query.date)); break
            case 'summary': csv = summaryCsv(await getPeriodSummary(gym.id, query)); break
            case 'plans': csv = planCsv(await getByPlan(gym.id, query.range)); break
            case 'pending': csv = pendingCsv(await getPending(gym.id, query.range)); break
            case 'staff': csv = staffCsv(await getByStaff(gym.id, query.range)); break
        }
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${exportFilename(query)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[reports/payments/export]', error)
        return new Response('Export failed', { status: 500 })
    }
}

import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { todayInKolkata } from '@/lib/reports/dates'
import { membersExportFilename, parseMembersParams, type RawParams } from '@/lib/reports/members-params'
import { getInactive, getJoins, getRenewals, getRetention, getRoster } from '@/lib/reports/members'
import { inactiveCsv, joinsCsv, renewalsCsv, retentionCsv, rosterCsv } from '@/lib/reports/members-csv'

export async function GET(request: Request) {
    const { user, gym, isStaff } = await getCurrentAdminContext()
    if (!user || !gym || !isStaff) return new Response('Unauthorized', { status: 401 })
    if (!(await gymHasFeature(gym.id, 'advanced_reports'))) return new Response('Advanced reports are not enabled for this gym', { status: 403 })

    const raw: RawParams = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = parseMembersParams(raw, todayInKolkata())

    try {
        let csv: string
        switch (query.tab) {
            case 'joins': csv = joinsCsv(await getJoins(gym.id, query)); break
            case 'renewals': csv = renewalsCsv(await getRenewals(gym.id, query)); break
            case 'retention': csv = retentionCsv(await getRetention(gym.id, query)); break
            case 'roster': csv = rosterCsv(await getRoster(gym.id, query.today)); break
            case 'inactive': csv = inactiveCsv(await getInactive(gym.id, query)); break
        }
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${membersExportFilename(query)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[reports/members/export]', error)
        return new Response('Export failed', { status: 500 })
    }
}

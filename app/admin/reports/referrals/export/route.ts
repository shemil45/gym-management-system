import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { todayInKolkata } from '@/lib/reports/dates'
import { parseReferralsParams, referralsExportFilename, type RawParams } from '@/lib/reports/referrals-params'
import { getLeaderboard, getOverview, getReferralList } from '@/lib/reports/referrals'
import { leaderboardCsv, listCsv, overviewCsv } from '@/lib/reports/referrals-csv'

export async function GET(request: Request) {
    const { user, gym, isStaff } = await getCurrentAdminContext()
    if (!user || !gym || !isStaff) return new Response('Unauthorized', { status: 401 })
    if (!(await gymHasFeature(gym.id, 'advanced_reports'))) return new Response('Advanced reports are not enabled for this gym', { status: 403 })
    if (!(await gymHasFeature(gym.id, 'referrals'))) return new Response('Referrals are not enabled for this gym', { status: 403 })

    const raw: RawParams = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = parseReferralsParams(raw, todayInKolkata())

    try {
        let csv: string
        switch (query.tab) {
            // The CSV has no comparison columns, so skip the comparison fetches.
            case 'overview': csv = overviewCsv(await getOverview(gym.id, { ...query, previous: null })); break
            case 'leaderboard': csv = leaderboardCsv(await getLeaderboard(gym.id, query)); break
            case 'list': csv = listCsv(await getReferralList(gym.id, query)); break
        }
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${referralsExportFilename(query)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[reports/referrals/export]', error)
        return new Response('Export failed', { status: 500 })
    }
}

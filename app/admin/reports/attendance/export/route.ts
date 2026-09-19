import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { todayInKolkata } from '@/lib/reports/dates'
import { attendanceExportFilename, parseAttendanceParams, type RawParams } from '@/lib/reports/attendance-params'
import { getByMember, getFootfall, getHeatmap } from '@/lib/reports/attendance'
import { byMemberCsv, footfallCsv, heatmapCsv } from '@/lib/reports/attendance-csv'

export async function GET(request: Request) {
    const { user, gym, isStaff } = await getCurrentAdminContext()
    if (!user || !gym || !isStaff) return new Response('Unauthorized', { status: 401 })
    if (!(await gymHasFeature(gym.id, 'advanced_reports'))) return new Response('Advanced reports are not enabled for this gym', { status: 403 })

    const raw: RawParams = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = parseAttendanceParams(raw, todayInKolkata())

    try {
        let csv: string
        switch (query.tab) {
            case 'footfall': csv = footfallCsv(await getFootfall(gym.id, query)); break
            case 'members': csv = byMemberCsv(await getByMember(gym.id, query)); break
            case 'heatmap': csv = heatmapCsv(await getHeatmap(gym.id, query)); break
        }
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${attendanceExportFilename(query)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[reports/attendance/export]', error)
        return new Response('Export failed', { status: 500 })
    }
}

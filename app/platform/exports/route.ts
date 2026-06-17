import { NextRequest, NextResponse } from 'next/server'
import { getCurrentPlatformContext, getPlatformDashboardData, getPlatformGyms } from '@/lib/platform/server'

function toDelimited(rows: Array<Array<string | number | null | undefined>>, delimiter: string) {
    return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(delimiter)).join('\n')
}

export async function GET(request: NextRequest) {
    const context = await getCurrentPlatformContext()

    if (!context.user || !context.platformAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const format = searchParams.get('format') || 'csv'
    const delimiter = format === 'excel' ? '\t' : ','
    const contentType = format === 'excel' ? 'application/vnd.ms-excel; charset=utf-8' : 'text/csv; charset=utf-8'
    const extension = format === 'excel' ? 'xls' : 'csv'

    let rows: Array<Array<string | number>>

    if (type === 'billing') {
        const gyms = await getPlatformGyms()
        rows = [
            ['gym_name', 'plan', 'status', 'billing_cycle', 'discount_pct', 'mrr'],
            ...gyms.map((gym) => [
                gym.name,
                gym.subscription?.plan?.name || '',
                gym.subscription?.status || '',
                gym.subscription?.billing_cycle || '',
                gym.subscription?.discount_pct || 0,
                gym.mrr || 0,
            ]),
        ]
    } else {
        const data = await getPlatformDashboardData()
        rows = [
            ['metric', 'value'],
            ['total_gyms', data.metrics.totalGyms],
            ['total_members', data.metrics.totalMembers],
            ['mrr', Number(data.metrics.mrr || 0)],
            ['arr', Number(data.metrics.arr || 0)],
            ['new_gyms_30d', data.metrics.newGyms],
            ['churned_gyms', data.metrics.churnedGyms],
        ]
    }

    const body = toDelimited(rows, delimiter)

    return new NextResponse(body, {
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename=\"platform-${type}.${extension}\"`,
        },
    })
}

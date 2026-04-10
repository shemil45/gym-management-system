import { addDays, format } from 'date-fns'
import { NextResponse } from 'next/server'
import { getMembersExpiringOn, sendMemberWhatsAppNotification } from '@/lib/notifications/service'

export const runtime = 'nodejs'

function isAuthorized(request: Request) {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
        return true
    }

    const authHeader = request.headers.get('authorization')
    const forwardedSecret = request.headers.get('x-cron-secret')

    return authHeader === `Bearer ${cronSecret}` || forwardedSecret === cronSecret
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            {
                success: false,
                error: 'Unauthorized cron request.',
            },
            { status: 401 }
        )
    }

    try {
        const targetDate = format(addDays(new Date(), 7), 'yyyy-MM-dd')
        const members = await getMembersExpiringOn(targetDate)
        const results = []

        for (const member of members) {
            const result = await sendMemberWhatsAppNotification({
                memberId: member.id,
                notificationType: 'membership_expiring',
                skipIfAlreadySentToday: true,
                source: 'cron',
            })

            results.push(result)
        }

        return NextResponse.json({
            success: true,
            processedAt: new Date().toISOString(),
            targetDate,
            totalMembers: members.length,
            sent: results.filter((item) => item.status === 'sent').length,
            skipped: results.filter((item) => item.status === 'skipped').length,
            failed: results.filter((item) => item.status === 'failed').length,
            results,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to process expiring membership notifications.'

        return NextResponse.json(
            {
                success: false,
                error: message,
            },
            { status: 500 }
        )
    }
}

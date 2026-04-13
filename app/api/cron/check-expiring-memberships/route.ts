import { addDays, format } from 'date-fns'
import { NextResponse } from 'next/server'
import {
    getMembersExpiringOn,
    sendMemberWhatsAppNotification,
    type SendMemberNotificationResult,
} from '@/lib/notifications/service'
import type { NotificationType } from '@/lib/notifications/templates'

export const runtime = 'nodejs'
const BUSINESS_TIME_ZONE = 'Asia/Kolkata'

type NotificationRunConfig = {
    notificationType: NotificationType
    offsetDays: number
}

function getBusinessDateValue(date = new Date(), offsetDays = 0) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date)

    const year = Number(parts.find((part) => part.type === 'year')?.value)
    const month = Number(parts.find((part) => part.type === 'month')?.value)
    const day = Number(parts.find((part) => part.type === 'day')?.value)

    return format(addDays(new Date(Date.UTC(year, month - 1, day)), offsetDays), 'yyyy-MM-dd')
}

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
        const businessDate = getBusinessDateValue()
        const notificationRuns: NotificationRunConfig[] = [
            { notificationType: 'membership_expiring', offsetDays: 7 },
            { notificationType: 'payment_reminder', offsetDays: 3 },
            { notificationType: 'membership_expired', offsetDays: 0 },
        ]

        const results: SendMemberNotificationResult[] = []
        const summary = {
            sent: 0,
            skipped: 0,
            failed: 0,
        }
        const byType = await Promise.all(
            notificationRuns.map(async ({ notificationType, offsetDays }) => {
                const targetDate = getBusinessDateValue(new Date(), offsetDays)
                const members = await getMembersExpiringOn(targetDate)
                const typeResults: SendMemberNotificationResult[] = []

                for (const member of members) {
                    const result = await sendMemberWhatsAppNotification({
                        memberId: member.id,
                        notificationType,
                        skipIfAlreadySentToday: true,
                        source: 'cron',
                        dateValue: businessDate,
                    })

                    typeResults.push(result)
                    results.push(result)
                    summary[result.status] += 1
                }

                return {
                    notificationType,
                    targetDate,
                    totalMembers: members.length,
                    sent: typeResults.filter((item) => item.status === 'sent').length,
                    skipped: typeResults.filter((item) => item.status === 'skipped').length,
                    failed: typeResults.filter((item) => item.status === 'failed').length,
                    results: typeResults,
                }
            })
        )

        const totalMembers = byType.reduce((count, group) => count + group.totalMembers, 0)

        return NextResponse.json({
            success: true,
            processedAt: new Date().toISOString(),
            businessDate,
            timeZone: BUSINESS_TIME_ZONE,
            totalMembers,
            sent: summary.sent,
            skipped: summary.skipped,
            failed: summary.failed,
            byType,
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

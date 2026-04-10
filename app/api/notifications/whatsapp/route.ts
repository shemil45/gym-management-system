import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isStaffRole } from '@/lib/auth/roles'
import { sendMemberWhatsAppNotification } from '@/lib/notifications/service'
import { notificationTypes } from '@/lib/notifications/templates'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

export const runtime = 'nodejs'

const requestSchema = z.object({
    memberId: z.string().uuid('A valid memberId is required.'),
    notificationType: z.enum(notificationTypes),
})

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required.',
                },
                { status: 401 }
            )
        }

        const profileResult = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const { data: profile, error: profileError } = profileResult as unknown as QueryResult<Pick<Tables<'profiles'>, 'role'> | null>

        if (profileError || !isStaffRole(profile?.role)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'You are not authorized to send notifications.',
                },
                { status: 403 }
            )
        }

        const body = await request.json()
        const parsed = requestSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request body.',
                    issues: parsed.error.flatten(),
                },
                { status: 400 }
            )
        }

        const result = await sendMemberWhatsAppNotification({
            memberId: parsed.data.memberId,
            notificationType: parsed.data.notificationType,
            source: 'api',
        })

        const statusCode = result.success
            ? result.status === 'sent'
                ? 200
                : 202
            : result.error.includes('not found')
                ? 404
                : 500

        return NextResponse.json(result, { status: statusCode })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error while sending WhatsApp notification.'

        return NextResponse.json(
            {
                success: false,
                error: message,
            },
            { status: 500 }
        )
    }
}

import { NextResponse } from 'next/server'
import { sweepExpiredImpersonations } from '@/lib/platform/impersonation-ledger'

/**
 * Closes impersonation sessions that timed out without an explicit Stop and
 * removes everything they created. Runs every 15 minutes (vercel.json); the
 * admin and platform layouts also sweep lazily so demo rows rarely outlive a
 * session by more than a page load.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // Same shared-secret scheme as the existing expiry-reminder cron.
    const secret = process.env.CRON_SECRET
    const provided =
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
        new URL(request.url).searchParams.get('secret')

    if (secret && provided !== secret) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const processed = await sweepExpiredImpersonations()
    return NextResponse.json({ ok: true, processed })
}

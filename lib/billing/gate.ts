import 'server-only'

import { redirect } from 'next/navigation'
import { getSubscriptionView } from '@/lib/billing/subscription'
import { getCurrentAuthResolution } from '@/lib/auth/gym-context'

/**
 * Subscription gating for the tenant admin and member portal.
 *
 * A lapsed subscription (expired, trial ended, cancelled, paused) keeps the
 * owner signed in - they can still reach the dashboard, reports, and billing
 * so they can renew - but the sections that create or change tenant records
 * are closed. Both halves live here so the page redirect and the server
 * action refusal can never disagree about what "lapsed" means.
 *
 * A platform operator in an impersonation session is exempt from both: they
 * are there to support the tenant, and a lapsed plan is often exactly what
 * they came to look at.
 */

export async function isImpersonating(): Promise<boolean> {
    const { activeImpersonation } = await getCurrentAuthResolution()
    return Boolean(activeImpersonation)
}

export const RENEW_PATH = '/admin/renew'

export const RENEW_MESSAGE =
    'Your GMS Cloud subscription has expired. Renew your plan to continue.'

/** Admin sections closed while lapsed. Everything else stays reachable. */
const GATED_PREFIXES = [
    '/admin/members',
    '/admin/finances',
    '/admin/staff',
    '/admin/settings/notifications',
]

export function isGatedPath(pathname: string): boolean {
    return GATED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Page-level gate: sends a lapsed tenant to the renewal page.
 *
 * Called from two places, and both are needed:
 *
 * - The admin layout, for full document loads. It sits above
 *   app/admin/loading.tsx, so redirect() becomes a real 307 before anything
 *   streams. Below that Suspense boundary the shell would already be on the
 *   wire and Next would fall back to a client-side redirect - a visible
 *   double load.
 * - Each gated section's layout, for client-side navigations. Shared layouts
 *   are not re-rendered on a soft navigation, so the admin layout never sees
 *   dashboard -> members; the section layout is a new segment and does.
 */
export async function redirectIfLapsed(gymId: string): Promise<void> {
    if (await isImpersonating()) return
    const view = await getSubscriptionView(gymId)
    if (view.isLapsed) redirect(RENEW_PATH)
}

export async function requireActiveSubscription(gymId: string, pathname: string): Promise<void> {
    if (!isGatedPath(pathname)) return
    await redirectIfLapsed(gymId)
}

/**
 * Action-level gate. Returns the error a server action should hand back, or
 * null when the tenant may proceed. Hiding a page is presentation; a stale
 * tab can still submit its form, so every mutating action calls this too.
 */
export async function assertActiveSubscription(gymId: string): Promise<{ error: string } | null> {
    if (await isImpersonating()) return null
    const view = await getSubscriptionView(gymId)
    return view.isLapsed ? { error: RENEW_MESSAGE } : null
}

/** Cheap boolean for callers that only branch on it. */
export async function isSubscriptionLapsed(gymId: string): Promise<boolean> {
    const view = await getSubscriptionView(gymId)
    return view.isLapsed
}

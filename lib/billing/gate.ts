import 'server-only'

import { redirect } from 'next/navigation'
import { getSubscriptionView } from '@/lib/billing/subscription'

/**
 * Subscription gating for the tenant admin and member portal.
 *
 * A lapsed subscription (expired, trial ended, cancelled, paused) keeps the
 * owner signed in - they can still reach the dashboard, reports, and billing
 * so they can renew - but the sections that create or change tenant records
 * are closed. Both halves live here so the page redirect and the server
 * action refusal can never disagree about what "lapsed" means.
 */

export const RENEW_PATH = '/admin/renew'

export const RENEW_MESSAGE =
    'Your GMS Cloud subscription has expired. Renew your plan to continue.'

/** Page-level gate: sends a lapsed tenant to the renewal page. */
export async function requireActiveSubscription(gymId: string): Promise<void> {
    const view = await getSubscriptionView(gymId)
    if (view.isLapsed) redirect(RENEW_PATH)
}

/**
 * Action-level gate. Returns the error a server action should hand back, or
 * null when the tenant may proceed. Hiding a page is presentation; a stale
 * tab can still submit its form, so every mutating action calls this too.
 */
export async function assertActiveSubscription(gymId: string): Promise<{ error: string } | null> {
    const view = await getSubscriptionView(gymId)
    return view.isLapsed ? { error: RENEW_MESSAGE } : null
}

/** Cheap boolean for callers that only branch on it. */
export async function isSubscriptionLapsed(gymId: string): Promise<boolean> {
    const view = await getSubscriptionView(gymId)
    return view.isLapsed
}

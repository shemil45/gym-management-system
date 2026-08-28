import 'server-only'

import { getSubscriptionView } from '@/lib/billing/subscription'

/**
 * Plan entitlement enforcement.
 *
 * Called from the server actions that create billable records. Hiding an "Add
 * member" button is presentation; this is the check that actually holds, and
 * it reads the limit from the database rather than anything the client sent.
 */

export type EntitlementFailure = { ok: false; reason: string }
export type EntitlementOk = { ok: true }
export type EntitlementResult = EntitlementOk | EntitlementFailure

/**
 * Whether the tenant may add another member.
 *
 * Two independent gates: the subscription has to be live at all, and the plan
 * has to have room. A lapsed subscription blocks growth but never blocks
 * reading or editing what already exists - locking an owner out of their own
 * member records over a failed card is punitive and loses data trust.
 */
export async function canAddMember(gymId: string): Promise<EntitlementResult> {
    const view = await getSubscriptionView(gymId)

    if (view.isLapsed) {
        return {
            ok: false,
            reason:
                view.state === 'trial_expired'
                    ? 'Your free trial has ended. Choose a plan to add more members.'
                    : 'Your GMS Cloud subscription is not active. Renew to add more members.',
        }
    }

    if (view.usage.memberLimitReached) {
        return {
            ok: false,
            reason: `Your ${view.plan?.name ?? 'current'} plan covers ${view.usage.memberLimit} members and you have ${view.usage.members}. Upgrade to add more.`,
        }
    }

    return { ok: true }
}

export async function canAddStaff(gymId: string): Promise<EntitlementResult> {
    const view = await getSubscriptionView(gymId)

    if (view.isLapsed) {
        return {
            ok: false,
            reason: 'Your GMS Cloud subscription is not active. Renew to add more staff.',
        }
    }

    if (view.usage.staffLimitReached) {
        return {
            ok: false,
            reason: `Your ${view.plan?.name ?? 'current'} plan covers ${view.usage.staffLimit} staff accounts and you have ${view.usage.staff}. Upgrade to add more.`,
        }
    }

    return { ok: true }
}

/**
 * Guards a downgrade: a tenant cannot move to a plan smaller than what they
 * are already using, because the alternative is silently holding them over a
 * limit the new plan does not permit.
 */
export async function canFitOnPlan(
    gymId: string,
    plan: { name: string; max_members: number | null; max_staff: number | null },
): Promise<EntitlementResult> {
    const view = await getSubscriptionView(gymId)
    const problems: string[] = []

    if (plan.max_members !== null && view.usage.members > plan.max_members) {
        problems.push(`${view.usage.members} members (limit ${plan.max_members})`)
    }

    if (plan.max_staff !== null && view.usage.staff > plan.max_staff) {
        problems.push(`${view.usage.staff} staff accounts (limit ${plan.max_staff})`)
    }

    if (problems.length > 0) {
        return {
            ok: false,
            reason: `${plan.name} does not fit your current usage: ${problems.join(' and ')}. Remove some first, or pick a larger plan.`,
        }
    }

    return { ok: true }
}

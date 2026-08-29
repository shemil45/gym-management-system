import 'server-only'

import { normalizeFeatureKeys } from '@/lib/platform/types'

/**
 * Plan entitlements: what a subscription is actually allowed to do.
 *
 * A plan's list entitlements live on `platform_subscription_plans`. What a
 * given tenant is entitled to is a *copy* of those, frozen onto
 * `gym_subscriptions.plan_entitlements` at the moment the plan was assigned.
 *
 * The copy exists because a plan is a price-list entry, not a contract. An
 * operator editing "Growth" to drop its member cap is changing what Growth
 * costs to buy today; it must not retroactively push existing Growth tenants
 * over a limit they never agreed to. Pushing new entitlements onto existing
 * subscriptions is a deliberate, audited action (`applyPlanToTenants`), never
 * a side effect of editing the catalogue.
 *
 * A NULL `plan_entitlements` means "no snapshot was taken - follow the live
 * plan". A `max_members: null` INSIDE a snapshot means "unlimited". Those are
 * different facts, which is why this is one jsonb column rather than three
 * nullable scalar ones.
 */

/** Columns needed to build a snapshot. Kept here so callers cannot drift. */
export const PLAN_ENTITLEMENT_COLUMNS = 'max_members, max_staff, features'

export type PlanEntitlementSource = {
    max_members: number | null
    max_staff: number | null
    features: unknown
}

export type PlanEntitlementSnapshot = {
    max_members: number | null
    max_staff: number | null
    features: string[]
}

export type ResolvedEntitlements = {
    maxMembers: number | null
    maxStaff: number | null
    features: string[]
    /** True when these came from a frozen snapshot rather than the live plan. */
    fromSnapshot: boolean
}

/** Freezes a plan's current entitlements into the shape stored on a subscription. */
export function buildEntitlementSnapshot(plan: PlanEntitlementSource): PlanEntitlementSnapshot {
    return {
        max_members: plan.max_members ?? null,
        max_staff: plan.max_staff ?? null,
        features: normalizeFeatureKeys(plan.features),
    }
}

function parseSnapshot(value: unknown): PlanEntitlementSnapshot | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null

    const record = value as Record<string, unknown>
    const members = record.max_members
    const staff = record.max_staff

    return {
        max_members: typeof members === 'number' && Number.isFinite(members) ? members : null,
        max_staff: typeof staff === 'number' && Number.isFinite(staff) ? staff : null,
        features: normalizeFeatureKeys(record.features),
    }
}

/**
 * The entitlements in force for one subscription.
 *
 * Snapshot wins when present; otherwise the live plan; otherwise nothing is
 * entitled and every limit is unlimited-by-absence, which is the same state a
 * subscription with no plan has always had.
 */
export function resolveEntitlements(
    snapshot: unknown,
    plan: PlanEntitlementSource | null | undefined,
): ResolvedEntitlements {
    const frozen = parseSnapshot(snapshot)

    if (frozen) {
        return {
            maxMembers: frozen.max_members,
            maxStaff: frozen.max_staff,
            features: frozen.features,
            fromSnapshot: true,
        }
    }

    return {
        maxMembers: plan?.max_members ?? null,
        maxStaff: plan?.max_staff ?? null,
        features: normalizeFeatureKeys(plan?.features),
        fromSnapshot: false,
    }
}

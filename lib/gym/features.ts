import 'server-only'

import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { PlanEntitlementSource } from '@/lib/billing/plan-entitlements'
import { resolveEntitlements } from '@/lib/billing/plan-entitlements'

/**
 * Feature resolution for one tenant.
 *
 * Order, first match wins (per the platform architecture plan §04.1):
 *
 *   1. Onboarding gate  - while onboarding_status != 'completed', only keys in
 *                         BASIC_TIER can resolve true, whatever the plan says.
 *   2. Gym override     - an explicit gym_feature_overrides row.
 *   3. Plan entitlement - key present in the subscription's frozen
 *                         entitlements, falling back to the plan's current
 *                         `features` array when nothing was snapshotted.
 *   4. Platform default - platform_feature_flags.is_enabled.
 *   5. false
 *
 * The gate can only ever narrow the result. That direction matters: a tenant
 * halfway through signup should never gain access because a plan was generous,
 * but finishing onboarding must never *remove* something they already had.
 */

/**
 * What a gym can use before it has finished onboarding.
 *
 * Chosen so a brand-new gym can actually run day one - take a member, check
 * them in, record a payment - while everything that implies a configured,
 * publicly-addressable tenant waits for the setup checklist.
 */
export const BASIC_TIER_FEATURES = ['members', 'check_ins', 'payments'] as const

export type GymFeatureState = {
    features: Record<string, boolean>
    onboardingComplete: boolean
    /** True when a feature is off solely because onboarding is incomplete. */
    gatedByOnboarding: string[]
}

export const getGymFeatureState = cache(async (gymId: string): Promise<GymFeatureState> => {
    const db = getSupabaseAdmin()

    const [gymResult, flagsResult, overridesResult, subscriptionResult] = await Promise.all([
        db.from('gyms').select('onboarding_status').eq('id', gymId).maybeSingle(),
        db.from('platform_feature_flags').select('id, key, is_enabled'),
        db.from('gym_feature_overrides').select('feature_flag_id, is_enabled').eq('gym_id', gymId),
        db
            .from('gym_subscriptions')
            .select('plan_entitlements, plan:platform_subscription_plans(max_members, max_staff, features)')
            .eq('gym_id', gymId)
            .maybeSingle(),
    ])

    const gym = gymResult.data as { onboarding_status: string } | null
    const flags = (flagsResult.data ?? []) as Array<{ id: string; key: string; is_enabled: boolean }>
    const overrides = (overridesResult.data ?? []) as Array<{
        feature_flag_id: string
        is_enabled: boolean
    }>

    const rawPlan = subscriptionResult.data as {
        plan_entitlements: unknown
        plan: PlanEntitlementSource | PlanEntitlementSource[] | null
    } | null
    const plan = Array.isArray(rawPlan?.plan) ? rawPlan?.plan[0] ?? null : rawPlan?.plan ?? null

    // Snapshot-first: what the tenant was entitled to when their plan was
    // assigned, not what that plan happens to include today.
    const planFeatures = new Set(resolveEntitlements(rawPlan?.plan_entitlements, plan).features)

    const overrideByFlag = new Map(overrides.map((row) => [row.feature_flag_id, row.is_enabled]))
    const onboardingComplete = gym?.onboarding_status === 'completed'
    const basic = new Set<string>(BASIC_TIER_FEATURES)

    const features: Record<string, boolean> = {}
    const gatedByOnboarding: string[] = []

    for (const flag of flags) {
        // What the tenant would get if onboarding were finished.
        const override = overrideByFlag.get(flag.id)
        const ungated =
            override !== undefined ? override : planFeatures.has(flag.key) ? true : flag.is_enabled

        if (!onboardingComplete && !basic.has(flag.key)) {
            features[flag.key] = false
            if (ungated) gatedByOnboarding.push(flag.key)
            continue
        }

        features[flag.key] = ungated
    }

    return { features, onboardingComplete, gatedByOnboarding }
})

/** Convenience for a single check at a call site. */
export async function gymHasFeature(gymId: string, key: string): Promise<boolean> {
    const { features } = await getGymFeatureState(gymId)
    return features[key] ?? false
}

export type OnboardingChecklistItem = {
    key: 'contact_email' | 'contact_phone' | 'subdomain'
    label: string
    description: string
    done: boolean
}

export type OnboardingProgress = {
    status: string
    complete: boolean
    items: OnboardingChecklistItem[]
    remaining: number
}

/**
 * The onboarding gate, in one place.
 *
 * Deliberately narrow: a contact route the platform can reach the owner on,
 * plus a claimed subdomain. Branding, address, tax details and notification
 * preferences all stay optional so onboarding cannot stall on cosmetics.
 */
export async function getOnboardingProgress(gymId: string): Promise<OnboardingProgress> {
    const db = getSupabaseAdmin()
    const result = await db
        .from('gyms')
        .select('contact_email, contact_phone, subdomain, onboarding_status')
        .eq('id', gymId)
        .maybeSingle()

    const gym = result.data as {
        contact_email: string | null
        contact_phone: string | null
        subdomain: string | null
        onboarding_status: string
    } | null

    const items: OnboardingChecklistItem[] = [
        {
            key: 'contact_email',
            label: 'Contact email',
            description: 'Where billing and account notices go.',
            done: Boolean(gym?.contact_email),
        },
        {
            key: 'contact_phone',
            label: 'Contact phone',
            description: 'Used when something needs a faster answer than email.',
            done: Boolean(gym?.contact_phone),
        },
        {
            key: 'subdomain',
            label: 'Web address',
            description: 'Your gym’s address on GMS Cloud. Members use it to sign in.',
            done: Boolean(gym?.subdomain),
        },
    ]

    return {
        status: gym?.onboarding_status ?? 'pending',
        complete: gym?.onboarding_status === 'completed',
        items,
        remaining: items.filter((item) => !item.done).length,
    }
}

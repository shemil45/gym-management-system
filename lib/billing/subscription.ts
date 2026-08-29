import 'server-only'

import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { resolveEntitlements } from '@/lib/billing/plan-entitlements'

/**
 * Tenant subscription state: one derivation, used everywhere.
 *
 * The stored `gym_subscriptions.status` is only part of the truth. Whether a
 * tenant is "expiring soon", inside a grace period, or already expired depends
 * on dates that move without anything writing to the row. Deriving that in
 * each surface separately is how a dashboard ends up saying "Active" while
 * billing says "Expired", so every surface reads this instead.
 *
 * This module is server-only. Nothing here may be recomputed from values a
 * client submitted - prices and entitlements are always read from the database.
 */

export type SubscriptionState =
    | 'none'
    | 'trial'
    | 'trial_ending'
    | 'trial_expired'
    | 'active'
    | 'renewing_soon'
    | 'ending_at_period_end'
    | 'past_due'
    | 'grace'
    | 'expired'
    | 'cancelled'
    | 'paused'

export type StateTone = 'ok' | 'info' | 'warn' | 'danger' | 'idle'

/** Window inside which a renewal or trial end is worth surfacing. */
export const EXPIRY_WARNING_DAYS = 7
const TRIAL_WARNING_DAYS = 5

export type PlanRecord = {
    id: string
    name: string
    code: string
    description: string | null
    price_monthly: number
    price_annual: number
    trial_days: number
    grace_period_days: number
    max_members: number | null
    max_staff: number | null
    sort_order: number
    is_active: boolean
    is_public: boolean
    features: unknown
}

export type SubscriptionRecord = {
    id: string
    gym_id: string
    plan_id: string | null
    status: string
    billing_interval: 'monthly' | 'annual'
    currency_code: string
    monthly_price: number
    annual_price: number
    discount_percentage: number
    discount_amount: number
    trial_ends_at: string | null
    current_period_start: string | null
    current_period_end: string | null
    next_invoice_at: string | null
    cancelled_at: string | null
    cancel_at_period_end: boolean
    cancellation_reason: string | null
    grace_ends_at: string | null
    failed_payment_count: number
    pending_plan_id: string | null
    pending_billing_interval: 'monthly' | 'annual' | null
    pending_effective_at: string | null
    /** Frozen entitlements copied from the plan at assignment. See plan-entitlements.ts. */
    plan_entitlements: unknown
    plan_entitlements_set_at: string | null
}

export type SubscriptionUsage = {
    members: number
    staff: number
    memberLimit: number | null
    staffLimit: number | null
    /** 0-1, or null when the plan is unlimited on that axis. */
    memberRatio: number | null
    staffRatio: number | null
    memberLimitReached: boolean
    staffLimitReached: boolean
}

export type SubscriptionView = {
    subscription: SubscriptionRecord | null
    plan: PlanRecord | null
    pendingPlan: PlanRecord | null
    state: SubscriptionState
    tone: StateTone
    /** Short label for pills and compact indicators. */
    label: string
    /** One sentence an operator or owner can act on. */
    headline: string
    detail: string
    /** True when the tenant should be nudged - drives the dashboard indicator. */
    requiresAction: boolean
    /** True when write access should be curtailed. */
    isLapsed: boolean
    /** The date the current state runs out, whatever kind of date that is. */
    effectiveUntil: string | null
    daysRemaining: number | null
    /** Charge for the current interval, discounts applied. */
    currentPrice: number
    usage: SubscriptionUsage
    /** Feature keys this subscription is entitled to, snapshot-first. */
    entitledFeatures: string[]
    /** True when entitlements are frozen rather than tracking the live plan. */
    entitlementsFrozen: boolean
}

function daysBetween(target: string | null | undefined): number | null {
    if (!target) return null
    const time = new Date(target).getTime()
    if (Number.isNaN(time)) return null
    return Math.ceil((time - Date.now()) / 86_400_000)
}

function isPast(value: string | null | undefined): boolean {
    if (!value) return false
    const time = new Date(value).getTime()
    return !Number.isNaN(time) && time <= Date.now()
}

/**
 * Charge for one billing interval after discounts.
 *
 * Percentage first, then the flat amount, floored at zero. Exported so the
 * checkout path and the UI cannot disagree about what is owed.
 */
export function priceForInterval(
    subscription: Pick<
        SubscriptionRecord,
        'billing_interval' | 'monthly_price' | 'annual_price' | 'discount_percentage' | 'discount_amount'
    >,
): number {
    const base =
        subscription.billing_interval === 'annual'
            ? Number(subscription.annual_price ?? 0)
            : Number(subscription.monthly_price ?? 0)

    const afterPercentage = base * (1 - Number(subscription.discount_percentage ?? 0) / 100)
    return Math.max(afterPercentage - Number(subscription.discount_amount ?? 0), 0)
}

/** Price a plan would cost at a given interval, before tenant-specific discounts. */
export function planPrice(plan: PlanRecord, interval: 'monthly' | 'annual'): number {
    return Number(interval === 'annual' ? plan.price_annual : plan.price_monthly)
}

const PRESENTATION: Record<
    SubscriptionState,
    { tone: StateTone; label: string; requiresAction: boolean; isLapsed: boolean }
> = {
    none: { tone: 'idle', label: 'No plan', requiresAction: true, isLapsed: false },
    trial: { tone: 'info', label: 'Trial', requiresAction: false, isLapsed: false },
    trial_ending: { tone: 'warn', label: 'Trial ending', requiresAction: true, isLapsed: false },
    trial_expired: { tone: 'danger', label: 'Trial ended', requiresAction: true, isLapsed: true },
    active: { tone: 'ok', label: 'Active', requiresAction: false, isLapsed: false },
    renewing_soon: { tone: 'info', label: 'Renewing soon', requiresAction: false, isLapsed: false },
    ending_at_period_end: { tone: 'warn', label: 'Ending', requiresAction: true, isLapsed: false },
    past_due: { tone: 'danger', label: 'Payment failed', requiresAction: true, isLapsed: false },
    grace: { tone: 'warn', label: 'Grace period', requiresAction: true, isLapsed: false },
    expired: { tone: 'danger', label: 'Expired', requiresAction: true, isLapsed: true },
    cancelled: { tone: 'idle', label: 'Cancelled', requiresAction: true, isLapsed: true },
    paused: { tone: 'idle', label: 'Paused', requiresAction: true, isLapsed: true },
}

/**
 * Derives the lifecycle state.
 *
 * Order is deliberate: hard terminal states first, then dated states, then the
 * healthy default. Each branch answers "what is true right now", never "what
 * was written last".
 */
function deriveState(
    subscription: SubscriptionRecord | null,
    plan: PlanRecord | null,
): { state: SubscriptionState; effectiveUntil: string | null } {
    if (!subscription) return { state: 'none', effectiveUntil: null }

    if (subscription.status === 'cancelled') {
        return { state: 'cancelled', effectiveUntil: subscription.cancelled_at }
    }

    if (subscription.status === 'paused') {
        return { state: 'paused', effectiveUntil: null }
    }

    if (subscription.status === 'trialing') {
        const trialEnd = subscription.trial_ends_at ?? subscription.current_period_end
        if (isPast(trialEnd)) return { state: 'trial_expired', effectiveUntil: trialEnd }

        const remaining = daysBetween(trialEnd)
        if (remaining !== null && remaining <= TRIAL_WARNING_DAYS) {
            return { state: 'trial_ending', effectiveUntil: trialEnd }
        }
        return { state: 'trial', effectiveUntil: trialEnd }
    }

    if (subscription.status === 'past_due') {
        // A failed renewal opens a grace window. Only once that window closes
        // does the tenant actually lose the plan.
        const graceEnd =
            subscription.grace_ends_at ??
            (subscription.current_period_end && plan
                ? new Date(
                      new Date(subscription.current_period_end).getTime() +
                          plan.grace_period_days * 86_400_000,
                  ).toISOString()
                : null)

        if (graceEnd && !isPast(graceEnd)) return { state: 'grace', effectiveUntil: graceEnd }
        if (graceEnd) return { state: 'expired', effectiveUntil: graceEnd }
        return { state: 'past_due', effectiveUntil: subscription.current_period_end }
    }

    // status === 'active'
    const periodEnd = subscription.current_period_end
    if (isPast(periodEnd)) return { state: 'expired', effectiveUntil: periodEnd }

    if (subscription.cancel_at_period_end) {
        return { state: 'ending_at_period_end', effectiveUntil: periodEnd }
    }

    const remaining = daysBetween(periodEnd)
    if (remaining !== null && remaining <= EXPIRY_WARNING_DAYS) {
        return { state: 'renewing_soon', effectiveUntil: periodEnd }
    }

    return { state: 'active', effectiveUntil: periodEnd }
}

function describe(
    state: SubscriptionState,
    daysRemaining: number | null,
    planName: string | null,
): { headline: string; detail: string } {
    const days = daysRemaining ?? 0
    const dayWord = Math.abs(days) === 1 ? 'day' : 'days'
    const plan = planName ?? 'your plan'

    switch (state) {
        case 'none':
            return {
                headline: 'No GMS Cloud plan assigned',
                detail: 'Choose a plan to keep using GMS Cloud beyond the basics.',
            }
        case 'trial':
            return {
                headline: `You're on a free trial of ${plan}`,
                detail: `${days} ${dayWord} left. Add a plan any time to keep everything running.`,
            }
        case 'trial_ending':
            return {
                headline: `Your ${plan} trial ends in ${days} ${dayWord}`,
                detail: 'Pick a plan now so your gym keeps working without interruption.',
            }
        case 'trial_expired':
            return {
                headline: 'Your free trial has ended',
                detail: 'Choose a plan to restore full access. Your data is safe and untouched.',
            }
        case 'active':
            return {
                headline: `${plan} is active`,
                detail: `Renews in ${days} ${dayWord}.`,
            }
        case 'renewing_soon':
            return {
                headline: `${plan} renews in ${days} ${dayWord}`,
                detail: 'Nothing to do unless you want to change plan first.',
            }
        case 'ending_at_period_end':
            return {
                headline: `${plan} ends in ${days} ${dayWord}`,
                detail: 'You cancelled this subscription. Resume any time before it ends.',
            }
        case 'past_due':
            return {
                headline: 'Your last payment did not go through',
                detail: 'Retry the payment to keep your plan active.',
            }
        case 'grace':
            return {
                headline: `Payment failed - ${days} ${dayWord} of access left`,
                detail: 'Retry the payment before the grace period ends to avoid losing your plan.',
            }
        case 'expired':
            return {
                headline: `${plan} has expired`,
                detail: 'Renew to restore full access. Your data is safe and untouched.',
            }
        case 'cancelled':
            return {
                headline: 'Your subscription is cancelled',
                detail: 'Choose a plan to start again whenever you are ready.',
            }
        case 'paused':
            return {
                headline: 'Your subscription is paused',
                detail: 'Contact support to resume billing on this account.',
            }
    }
}

const PLAN_COLUMNS =
    'id, name, code, description, price_monthly, price_annual, trial_days, grace_period_days, max_members, max_staff, sort_order, is_active, is_public, features'

/**
 * Loads and derives everything the subscription surfaces need for one tenant.
 *
 * Uses the service-role client because plans and subscriptions are platform
 * tables that tenant RLS deliberately does not expose; the caller is
 * responsible for having established that this gym is the caller's own.
 */
export const getSubscriptionView = cache(async (gymId: string): Promise<SubscriptionView> => {
    const db = getSupabaseAdmin()

    const [subResult, membersResult, staffResult] = await Promise.all([
        db
            .from('gym_subscriptions')
            .select(`*, plan:platform_subscription_plans!gym_subscriptions_plan_id_fkey(${PLAN_COLUMNS})`)
            .eq('gym_id', gymId)
            .maybeSingle(),
        db.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
        db.from('admins').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
    ])

    // A failed read must not be mistaken for "this tenant has no plan".
    // Silently degrading to `none` would tell a paying customer their
    // subscription had vanished and invite them to buy one they already have,
    // so a transport-level failure is raised instead of rendered.
    if (subResult.error) {
        throw new Error(`Could not load the subscription for this gym: ${subResult.error.message}`)
    }

    const raw = subResult.data as (SubscriptionRecord & { plan: PlanRecord | PlanRecord[] | null }) | null
    const plan = raw ? (Array.isArray(raw.plan) ? raw.plan[0] ?? null : raw.plan) : null
    const subscription = raw ? ({ ...raw, plan: undefined } as unknown as SubscriptionRecord) : null

    let pendingPlan: PlanRecord | null = null
    if (subscription?.pending_plan_id) {
        const pendingResult = await db
            .from('platform_subscription_plans')
            .select(PLAN_COLUMNS)
            .eq('id', subscription.pending_plan_id)
            .maybeSingle()
        pendingPlan = (pendingResult.data as PlanRecord | null) ?? null
    }

    const members = membersResult.count ?? 0
    const staff = staffResult.count ?? 0

    // Limits come from the entitlements frozen onto the subscription when the
    // plan was assigned, not from the plan's current list values - editing a
    // plan in the portal must not move the ceiling under a tenant already on
    // it. Falls back to the live plan when no snapshot exists.
    const entitlements = resolveEntitlements(subscription?.plan_entitlements, plan)
    const memberLimit = entitlements.maxMembers
    const staffLimit = entitlements.maxStaff

    const { state, effectiveUntil } = deriveState(subscription, plan)
    const presentation = PRESENTATION[state]
    const daysRemaining = daysBetween(effectiveUntil)
    const { headline, detail } = describe(state, daysRemaining, plan?.name ?? null)

    return {
        subscription,
        plan,
        pendingPlan,
        state,
        tone: presentation.tone,
        label: presentation.label,
        headline,
        detail,
        requiresAction: presentation.requiresAction,
        isLapsed: presentation.isLapsed,
        effectiveUntil,
        daysRemaining,
        currentPrice: subscription ? priceForInterval(subscription) : 0,
        entitledFeatures: entitlements.features,
        entitlementsFrozen: entitlements.fromSnapshot,
        usage: {
            members,
            staff,
            memberLimit,
            staffLimit,
            memberRatio: memberLimit ? Math.min(members / memberLimit, 1) : null,
            staffRatio: staffLimit ? Math.min(staff / staffLimit, 1) : null,
            memberLimitReached: memberLimit !== null && members >= memberLimit,
            staffLimitReached: staffLimit !== null && staff >= staffLimit,
        },
    }
})

/** Plans a tenant may choose from, cheapest tier first. */
export async function getSelectablePlans(): Promise<PlanRecord[]> {
    const db = getSupabaseAdmin()
    const result = await db
        .from('platform_subscription_plans')
        .select(PLAN_COLUMNS)
        .eq('is_active', true)
        .eq('is_public', true)
        .order('sort_order', { ascending: true })

    return (result.data ?? []) as PlanRecord[]
}

export async function getTenantInvoices(gymId: string, limit = 24) {
    const db = getSupabaseAdmin()
    const result = await db
        .from('gym_subscription_invoices')
        .select('*, plan:platform_subscription_plans(name)')
        .eq('gym_id', gymId)
        .order('issued_at', { ascending: false })
        .limit(limit)

    return (result.data ?? []) as Array<{
        id: string
        invoice_number: string
        status: string
        amount_due: number
        amount_paid: number
        currency_code: string
        issued_at: string
        paid_at: string | null
        failed_at: string | null
        period_start: string | null
        period_end: string | null
        razorpay_payment_id: string | null
        payment_method: string | null
        billing_interval: string | null
        plan: { name: string } | { name: string }[] | null
    }>
}

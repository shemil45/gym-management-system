/**
 * Platform Portal domain types.
 *
 * These mirror the tables actually deployed in the `gym-management` Supabase
 * project. The previous version of this file described a different schema
 * (`saas_plans`, `max_members`, `razorpay_subscription_id`) that was never
 * migrated, so every query written against it failed at runtime.
 */

export type PlatformRole = 'owner' | 'billing_admin' | 'support_agent' | 'analyst'

export type GymPlatformStatus = 'active' | 'trialing' | 'suspended' | 'cancelled'
export type GymOnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'stalled'
export type GymSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused'
export type BillingInterval = 'monthly' | 'annual'
export type PlatformInvoiceStatus = 'draft' | 'open' | 'paid' | 'failed' | 'void'

/** Ranked most to least urgent. Drives dashboard ordering. */
export const PLATFORM_STATUS_ORDER: GymPlatformStatus[] = ['suspended', 'cancelled', 'trialing', 'active']

export type PlatformAdminRecord = {
    id: string
    user_id: string
    role: PlatformRole
    is_active: boolean
    last_login_at: string | null
    created_at: string
    updated_at: string
}

/** platform_admins holds no name or email; both are joined from profiles/auth. */
export type PlatformAdminIdentity = PlatformAdminRecord & {
    full_name: string
    email: string | null
}

export type SubscriptionPlan = {
    id: string
    name: string
    code: string
    description: string | null
    price_monthly: number
    price_annual: number
    trial_days: number
    /** Days of access retained after a failed renewal before the plan lapses. */
    grace_period_days: number
    /** Hard caps enforced on create. Null means unlimited. */
    max_members: number | null
    max_staff: number | null
    /** Tier order. Upgrade vs downgrade is decided by this, not by price. */
    sort_order: number
    is_active: boolean
    /** Whether tenants can self-select this plan from their billing page. */
    is_public: boolean
    features: unknown
    created_at: string
    updated_at: string
}

export type GymSubscription = {
    id: string
    gym_id: string
    plan_id: string | null
    status: GymSubscriptionStatus
    billing_interval: BillingInterval
    currency_code: string
    monthly_price: number
    annual_price: number
    discount_percentage: number
    discount_amount: number
    free_extension_days: number
    trial_ends_at: string | null
    current_period_start: string | null
    current_period_end: string | null
    next_invoice_at: string | null
    cancelled_at: string | null
    failed_payment_count: number
    notes: string | null
    created_at: string
    updated_at: string
}

export type SubscriptionWithPlan = GymSubscription & { plan: SubscriptionPlan | null }

export type SubscriptionInvoice = {
    id: string
    gym_id: string
    subscription_id: string | null
    invoice_number: string
    status: PlatformInvoiceStatus
    currency_code: string
    amount_due: number
    amount_paid: number
    due_at: string | null
    issued_at: string
    paid_at: string | null
    failed_at: string | null
    period_start: string | null
    period_end: string | null
    created_at: string
    updated_at: string
}

export type FeatureFlag = {
    id: string
    key: string
    description: string | null
    is_enabled: boolean
    created_at: string
    updated_at: string
}

export type GymFeatureOverride = {
    id: string
    gym_id: string
    feature_flag_id: string
    is_enabled: boolean
    created_at: string
    updated_at: string
}

export type PlatformAuditLog = {
    id: string
    actor_user_id: string | null
    actor_platform_admin_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    gym_id: string | null
    metadata: Record<string, unknown>
    ip_address: string | null
    user_agent: string | null
    created_at: string
}

export type ImpersonationSession = {
    id: string
    platform_admin_id: string
    gym_id: string
    started_by_user_id: string
    reason: string | null
    banner_note: string | null
    started_at: string
    expires_at: string
    ended_at: string | null
}

export type PlatformGym = {
    id: string
    name: string
    slug: string | null
    subdomain: string | null
    is_active: boolean
    business_name: string | null
    contact_email: string | null
    contact_phone: string | null
    platform_status: GymPlatformStatus
    onboarding_status: GymOnboardingStatus
    trial_ends_at: string | null
    onboarding_completed_at: string | null
    suspended_at: string | null
    suspension_reason: string | null
    platform_notes: string | null
    city: string | null
    state: string | null
    country: string | null
    created_at: string
    updated_at: string
}

/** A tenant row joined with everything the directory and dashboard need. */
export type TenantSummary = PlatformGym & {
    subscription: SubscriptionWithPlan | null
    memberCount: number
    staffCount: number
    /** Monthly-equivalent revenue for this tenant, discounts applied. */
    mrr: number
}

/**
 * Monthly-equivalent price for one subscription.
 *
 * Annual plans are divided by 12 so MRR stays comparable across billing
 * intervals. Percentage discount is applied before the flat discount, and the
 * result is floored at zero so a comp'd tenant can never subtract from MRR.
 */
export function monthlyEquivalent(subscription: GymSubscription | null | undefined): number {
    if (!subscription) return 0
    if (subscription.status !== 'active' && subscription.status !== 'trialing') return 0

    const base =
        subscription.billing_interval === 'annual'
            ? Number(subscription.annual_price ?? 0) / 12
            : Number(subscription.monthly_price ?? 0)

    const afterPercentage = base * (1 - Number(subscription.discount_percentage ?? 0) / 100)
    const afterFlat = afterPercentage - Number(subscription.discount_amount ?? 0) / (subscription.billing_interval === 'annual' ? 12 : 1)

    return Math.max(afterFlat, 0)
}

/** Only `active` subscriptions bill. Trials are counted separately as pipeline. */
export function isBillingRevenue(subscription: GymSubscription | null | undefined): boolean {
    return subscription?.status === 'active'
}

export function normalizeFeatureKeys(features: unknown): string[] {
    if (Array.isArray(features)) {
        return features
            .flatMap((entry) => {
                if (typeof entry === 'string') return [entry]
                if (entry && typeof entry === 'object' && 'key' in entry && typeof entry.key === 'string') {
                    return [entry.key]
                }
                return []
            })
            .filter(Boolean)
    }

    if (features && typeof features === 'object') {
        return Object.entries(features)
            .filter(([, value]) => Boolean(value))
            .map(([key]) => key)
    }

    return []
}

export function formatPlatformRole(role: PlatformRole): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function daysUntil(value: string | null | undefined): number | null {
    if (!value) return null
    const target = new Date(value).getTime()
    if (Number.isNaN(target)) return null
    return Math.ceil((target - Date.now()) / 86_400_000)
}

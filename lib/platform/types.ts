import type { Tables } from '@/lib/types'

export type PlatformAdmin = {
    id: string
    user_id: string
    full_name: string
    email: string
    role: 'owner' | 'billing_admin' | 'support_agent' | 'analyst'
    is_active: boolean
    invited_by: string | null
    last_sign_in_at: string | null
    created_at: string
    updated_at: string
}

export type SaaSPlan = {
    id: string
    name: string
    slug: string
    price_monthly: number
    price_yearly: number
    max_members: number | null
    max_staff: number | null
    features: unknown
    is_active: boolean
    is_public: boolean
    sort_order: number
    created_at: string
    updated_at: string
}

export type SaaSSubscription = {
    id: string
    gym_id: string
    saas_plan_id: string
    status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused'
    billing_cycle: 'monthly' | 'yearly'
    current_period_start: string
    current_period_end: string
    cancel_at_period_end: boolean
    cancelled_at: string | null
    cancel_reason: string | null
    discount_pct: number
    razorpay_subscription_id: string | null
    created_at: string
    updated_at: string
}

export type SaaSInvoice = {
    id: string
    gym_id: string
    subscription_id: string
    invoice_number: string
    amount: number
    currency: string
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'waived' | 'void'
    due_date: string
    paid_at: string | null
    payment_method: string | null
    razorpay_payment_id: string | null
    pdf_url: string | null
    period_start: string
    period_end: string
    notes: string | null
    created_at: string
    updated_at: string
}

export type GymFeatureFlag = {
    id: string
    gym_id: string
    flag_key: string
    is_enabled: boolean
    overridden_by: string | null
    note: string | null
    expires_at: string | null
    created_at: string
    updated_at: string
}

export type PlatformAuditLog = {
    id: string
    actor_id: string
    gym_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    old_data: Record<string, unknown> | null
    new_data: Record<string, unknown> | null
    ip_address: string | null
    user_agent: string | null
    is_impersonation: boolean
    impersonation_session_id: string | null
    created_at: string
}

export type PlatformAnnouncement = {
    id: string
    created_by: string
    title: string
    body: string
    type: 'info' | 'warning' | 'maintenance' | 'feature' | 'critical'
    target_plan_id: string | null
    target_gym_id: string | null
    is_published: boolean
    publish_at: string | null
    expires_at: string | null
    created_at: string
    updated_at: string
}

export type ImpersonationSession = {
    id: string
    platform_admin_id: string
    gym_id: string
    impersonated_user_id: string
    reason: string
    token_hash: string
    started_at: string
    ended_at: string | null
}

export type SupportTicket = {
    id: string
    gym_id: string
    assigned_to: string | null
    ticket_number: string
    subject: string
    category: string
    status: 'open' | 'in_progress' | 'waiting_on_gym' | 'resolved' | 'closed'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    resolved_at: string | null
    created_at: string
    updated_at: string
}

export type SupportTicketMessage = {
    id: string
    ticket_id: string
    sender_type: 'gym_admin' | 'platform_admin'
    sender_id: string
    body: string
    is_internal_note: boolean
    created_at: string
}

export type GymDailyStat = {
    id: string
    gym_id: string
    stat_date: string
    total_members: number
    active_members: number
    expired_members: number
    new_members: number
    checkins_count: number
    revenue: number
    expenses: number
    admin_last_login: string | null
    snapshot_at: string
}

export type PlatformDailyStat = {
    id: string
    stat_date: string
    total_gyms: number
    active_gyms: number
    trial_gyms: number
    suspended_gyms: number
    new_gyms: number
    churned_gyms: number
    total_members_all: number
    mrr: number
    arr: number
    snapshot_at: string
}

export type PlatformGym = Tables<'gyms'> & {
    owner_id?: string | null
    saas_plan_id?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    timezone?: string | null
    logo_url?: string | null
}

export type PlanFeatureKey = {
    key: string
    plans: string[]
}

export function normalizeFeatureKeys(features: unknown): string[] {
    if (Array.isArray(features)) {
        return features
            .flatMap((entry) => {
                if (typeof entry === 'string') return [entry]
                if (entry && typeof entry === 'object' && 'key' in entry && typeof entry.key === 'string') return [entry.key]
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

export function formatPlanFeatureIndex(plans: SaaSPlan[]): PlanFeatureKey[] {
    const index = new Map<string, Set<string>>()

    for (const plan of plans) {
        for (const key of normalizeFeatureKeys(plan.features)) {
            const existing = index.get(key) ?? new Set<string>()
            existing.add(plan.name)
            index.set(key, existing)
        }
    }

    return Array.from(index.entries())
        .map(([key, names]) => ({ key, plans: Array.from(names).sort() }))
        .sort((a, b) => a.key.localeCompare(b.key))
}

export function getSubscriptionAmount(subscription: SaaSSubscription | null | undefined, plan?: SaaSPlan | null) {
    if (!subscription || !plan) return 0
    const base = subscription.billing_cycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly
    return Math.max(base * (1 - Number(subscription.discount_pct ?? 0) / 100), 0)
}

import 'server-only'

import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { resolveEntitlements } from '@/lib/billing/plan-entitlements'
import {
    type FeatureFlag,
    type GymFeatureOverride,
    type PlatformAuditLog,
    type PlatformGym,
    type SubscriptionInvoice,
    type SubscriptionPlan,
    type SubscriptionWithPlan,
    type TenantSummary,
    daysUntil,
    isBillingRevenue,
    monthlyEquivalent,
    normalizeFeatureKeys,
} from '@/lib/platform/types'

/**
 * Cross-tenant reads for the Platform Portal.
 *
 * Every function here uses the service-role client and therefore bypasses
 * RLS. That is deliberate and is the ONLY sanctioned place it happens for
 * platform-level queries: the alternative, widening tenant RLS policies so
 * "any platform admin" could select across gyms, would weaken isolation for
 * every request in the app rather than just these.
 *
 * The access check lives in the caller (requirePlatformSession /
 * requireCapability). Nothing in this module may be reached from a route that
 * has not already run one.
 */

const service = () => getSupabaseAdmin()

/** Trials closing inside this window show up on the dashboard alert lane. */
const TRIAL_WARNING_DAYS = 14

export type PlatformOverview = {
    tenants: TenantSummary[]
    metrics: {
        mrr: number
        arr: number
        totalTenants: number
        activeTenants: number
        trialingTenants: number
        suspendedTenants: number
        totalMembers: number
        newTenants30d: number
        churnRate: number
        platformVolume30d: number
    }
    alerts: {
        expiringTrials: TenantSummary[]
        suspended: TenantSummary[]
        pastDue: TenantSummary[]
        incompleteOnboarding: TenantSummary[]
    }
    revenueSeries: { date: string; volume: number }[]
    recentAudit: PlatformAuditLog[]
}

/**
 * Joins every gym with its subscription, plan, member count and staff count.
 *
 * Counts are aggregated in JS from two flat selects rather than issuing one
 * count query per gym: at N tenants that would be 2N round trips, and the
 * id-only payload stays small well past the point where this portal would
 * need a materialized snapshot table anyway.
 */
/**
 * Request-deduplicated: nearly every platform route needs this, and the
 * global header's alert count needs it on all of them. Without `cache` the
 * header would double every page's tenant read.
 */
export const getTenantSummaries = cache(async (): Promise<TenantSummary[]> => {
    const db = service()

    /*
      The counts come from a view, not from the rows.

      This used to select every members row and every admins row on the
      platform and tally them here. That is one row over the wire per member
      of every gym, on a page that wants a single integer per gym, and it runs
      on the directory, the dashboard, the billing overview and the alert
      tray. It was also quietly unsafe: PostgREST caps an unbounded select, so
      past that cap the tallies would have come back wrong rather than failed.

      public.gym_directory_counts does the counting in Postgres against
      indexes that already lead with gym_id.
    */
    const [gymsResult, subscriptionsResult, countsResult] = await Promise.all([
        db.from('gyms').select('*').order('created_at', { ascending: false }),
        db.from('gym_subscriptions').select('*, plan:platform_subscription_plans(*)'),
        db.from('gym_directory_counts').select('gym_id, member_count, staff_count'),
    ])

    const gyms = (gymsResult.data ?? []) as PlatformGym[]
    const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionWithPlan[]
    const counts = (countsResult.data ?? []) as Array<{
        gym_id: string
        member_count: number | string
        staff_count: number | string
    }>

    const subscriptionByGym = new Map(subscriptions.map((row) => [row.gym_id, row]))

    // count(*) is a bigint, which PostgREST is free to hand back as a string.
    // Coercing here keeps that detail out of every consumer of TenantSummary.
    const countsByGym = new Map(
        counts.map((row) => [
            row.gym_id,
            { members: Number(row.member_count) || 0, staff: Number(row.staff_count) || 0 },
        ]),
    )

    return gyms.map((gym) => {
        const subscription = subscriptionByGym.get(gym.id) ?? null
        const tallies = countsByGym.get(gym.id)
        return {
            ...gym,
            subscription,
            memberCount: tallies?.members ?? 0,
            staffCount: tallies?.staff ?? 0,
            mrr: monthlyEquivalent(subscription),
        }
    })
})

export type PlatformAlerts = PlatformOverview['alerts']

/**
 * The four things that pull an operator's attention, derived in one place.
 *
 * The dashboard's alert lane and the global header's notification tray read
 * the same function, so a tenant can never be "needs attention" in one and
 * quiet in the other.
 */
export function deriveTenantAlerts(tenants: TenantSummary[]): PlatformAlerts {
    return {
        expiringTrials: tenants.filter((tenant) => {
            const remaining = daysUntil(tenant.trial_ends_at ?? tenant.subscription?.trial_ends_at)
            return (
                tenant.platform_status !== 'suspended' &&
                tenant.platform_status !== 'cancelled' &&
                remaining !== null &&
                remaining <= TRIAL_WARNING_DAYS
            )
        }),
        suspended: tenants.filter((tenant) => tenant.platform_status === 'suspended'),
        pastDue: tenants.filter((tenant) => tenant.subscription?.status === 'past_due'),
        incompleteOnboarding: tenants.filter(
            (tenant) => tenant.onboarding_status !== 'completed' && tenant.platform_status !== 'cancelled',
        ),
    }
}

/** Alert lane on its own, for chrome that must not pay for the full overview. */
export async function getPlatformAlerts(): Promise<PlatformAlerts> {
    return deriveTenantAlerts(await getTenantSummaries())
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
    const db = service()
    const since30 = new Date(Date.now() - 30 * 86_400_000)

    const [tenants, paymentsResult, auditResult] = await Promise.all([
        getTenantSummaries(),
        // Total money moving through every tenant's gym. This is platform
        // volume (a health signal), NOT platform revenue.
        db
            .from('payments')
            .select('amount, payment_date')
            .eq('payment_status', 'paid')
            .gte('payment_date', since30.toISOString().slice(0, 10)),
        db.from('platform_audit_logs').select('*').order('created_at', { ascending: false }).limit(12),
    ])

    const payments = (paymentsResult.data ?? []) as Array<{ amount: unknown; payment_date: string }>

    // MRR counts only subscriptions that actually bill. Trials are pipeline,
    // not revenue; folding them in is the classic way a SaaS dashboard
    // flatters itself.
    const mrr = tenants
        .filter((tenant) => isBillingRevenue(tenant.subscription))
        .reduce((total, tenant) => total + tenant.mrr, 0)

    const activeTenants = tenants.filter((t) => t.platform_status === 'active').length
    const trialingTenants = tenants.filter((t) => t.platform_status === 'trialing').length
    const suspendedTenants = tenants.filter((t) => t.platform_status === 'suspended').length
    const cancelled = tenants.filter((t) => t.platform_status === 'cancelled').length
    const newTenants30d = tenants.filter((t) => new Date(t.created_at) >= since30).length

    // Churn denominator is every tenant that ever reached a billable state,
    // so a cancelled tenant stays in the denominator it churned out of.
    const churnDenominator = activeTenants + suspendedTenants + cancelled
    const churnRate = churnDenominator > 0 ? (cancelled / churnDenominator) * 100 : 0

    const volumeByDate = new Map<string, number>()
    let platformVolume30d = 0
    for (const payment of payments) {
        const amount = Number(payment.amount ?? 0)
        if (!Number.isFinite(amount)) continue
        platformVolume30d += amount
        volumeByDate.set(payment.payment_date, (volumeByDate.get(payment.payment_date) ?? 0) + amount)
    }

    // Dense the series so gaps render as zero rather than closing the line
    // across a missing day, which would overstate continuity.
    const revenueSeries = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(Date.now() - (29 - index) * 86_400_000).toISOString().slice(0, 10)
        return { date, volume: volumeByDate.get(date) ?? 0 }
    })

    return {
        tenants,
        metrics: {
            mrr,
            arr: mrr * 12,
            totalTenants: tenants.length,
            activeTenants,
            trialingTenants,
            suspendedTenants,
            totalMembers: tenants.reduce((total, tenant) => total + tenant.memberCount, 0),
            newTenants30d,
            churnRate,
            platformVolume30d,
        },
        alerts: deriveTenantAlerts(tenants),
        revenueSeries,
        recentAudit: (auditResult.data ?? []) as PlatformAuditLog[],
    }
}

export type TenantDetail = {
    tenant: TenantSummary | null
    plans: SubscriptionPlan[]
    invoices: SubscriptionInvoice[]
    staff: Array<{ id: string; role: string; created_at: string; full_name: string | null }>
    flags: Array<FeatureFlag & { override: GymFeatureOverride | null; effective: boolean }>
    audit: PlatformAuditLog[]
    memberTrend: { date: string; joined: number }[]
}

export async function getTenantDetail(gymId: string): Promise<TenantDetail> {
    const db = service()

    const [
        gymResult,
        subscriptionResult,
        plansResult,
        invoicesResult,
        staffResult,
        flagsResult,
        overridesResult,
        auditResult,
        membersResult,
    ] = await Promise.all([
        db.from('gyms').select('*').eq('id', gymId).maybeSingle(),
        db.from('gym_subscriptions').select('*, plan:platform_subscription_plans(*)').eq('gym_id', gymId).maybeSingle(),
        db.from('platform_subscription_plans').select('*').eq('is_active', true).order('price_monthly'),
        db.from('gym_subscription_invoices').select('*').eq('gym_id', gymId).order('issued_at', { ascending: false }).limit(20),
        db.from('admins').select('id, role, created_at, profile:profiles(full_name)').eq('gym_id', gymId).order('created_at'),
        db.from('platform_feature_flags').select('*').order('key'),
        db.from('gym_feature_overrides').select('*').eq('gym_id', gymId),
        db.from('platform_audit_logs').select('*').eq('gym_id', gymId).order('created_at', { ascending: false }).limit(20),
        db.from('members').select('id, created_at').eq('gym_id', gymId),
    ])

    const gym = gymResult.data as PlatformGym | null
    if (!gym) {
        return { tenant: null, plans: [], invoices: [], staff: [], flags: [], audit: [], memberTrend: [] }
    }

    const subscription = subscriptionResult.data as SubscriptionWithPlan | null
    const members = (membersResult.data ?? []) as Array<{ id: string; created_at: string }>
    const staffRows = (staffResult.data ?? []) as Array<{
        id: string
        role: string
        created_at: string
        profile: { full_name: string } | { full_name: string }[] | null
    }>

    const flags = (flagsResult.data ?? []) as FeatureFlag[]
    const overrides = (overridesResult.data ?? []) as GymFeatureOverride[]
    const overrideByFlag = new Map(overrides.map((row) => [row.feature_flag_id, row]))

    // Joins are 30 daily buckets of member signups.
    const joinsByDate = new Map<string, number>()
    for (const member of members) {
        const day = member.created_at.slice(0, 10)
        joinsByDate.set(day, (joinsByDate.get(day) ?? 0) + 1)
    }
    const memberTrend = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(Date.now() - (29 - index) * 86_400_000).toISOString().slice(0, 10)
        return { date, joined: joinsByDate.get(date) ?? 0 }
    })

    return {
        tenant: {
            ...gym,
            subscription,
            memberCount: members.length,
            staffCount: staffRows.length,
            mrr: monthlyEquivalent(subscription),
        },
        plans: (plansResult.data ?? []) as SubscriptionPlan[],
        invoices: (invoicesResult.data ?? []) as SubscriptionInvoice[],
        staff: staffRows.map((row) => {
            const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
            return {
                id: row.id,
                role: row.role,
                created_at: row.created_at,
                full_name: profile?.full_name ?? null,
            }
        }),
        flags: flags.map((flag) => {
            const override = overrideByFlag.get(flag.id) ?? null
            return {
                ...flag,
                override,
                // Resolution order per the architecture plan: an explicit gym
                // override wins over the platform default.
                effective: override ? override.is_enabled : flag.is_enabled,
            }
        }),
        audit: (auditResult.data ?? []) as PlatformAuditLog[],
        memberTrend,
    }
}

export type FlagMatrix = {
    flags: FeatureFlag[]
    tenants: TenantSummary[]
    /** `${gymId}:${flagId}` -> explicit override. Absent means "inherit". */
    overrides: Map<string, GymFeatureOverride>
}

export async function getFlagMatrix(): Promise<FlagMatrix> {
    const db = service()
    const [flagsResult, overridesResult, tenants] = await Promise.all([
        db.from('platform_feature_flags').select('*').order('key'),
        db.from('gym_feature_overrides').select('*'),
        getTenantSummaries(),
    ])

    const overrides = new Map<string, GymFeatureOverride>()
    for (const row of (overridesResult.data ?? []) as GymFeatureOverride[]) {
        overrides.set(`${row.gym_id}:${row.feature_flag_id}`, row)
    }

    return { flags: (flagsResult.data ?? []) as FeatureFlag[], tenants, overrides }
}

/** How far ahead the billing page looks for upcoming renewals. */
const RENEWAL_WINDOW_DAYS = 14

export type BillingInvoice = SubscriptionInvoice & { tenantName: string }

export type BillingCollection = {
    tenant: TenantSummary
    /** Open invoice balance for this tenant, in rupees. */
    owed: number
    /** Days past the earliest overdue invoice's due date; null if nothing is overdue yet. */
    daysOverdue: number | null
    failedAttempts: number
}

export type BillingRenewal = {
    tenant: TenantSummary
    /** What the next charge will be for, after discounts. */
    amount: number
    daysUntilRenewal: number
}

export type BillingOverview = {
    metrics: {
        collectedThisMonth: number
        collectedCount: number
        outstanding: number
        outstandingCount: number
        failedInvoices: number
        pastDueTenants: number
        pipeline: number
        trialing: number
    }
    collections: BillingCollection[]
    renewals: BillingRenewal[]
    invoices: BillingInvoice[]
}

/**
 * Money moving and money at risk, network-wide.
 *
 * Deliberately not the plan catalogue (that is /platform/plans) and not the
 * tenant roster (that is /platform/tenants). Everything here is derived
 * from invoices and the subscription lifecycle fields, so a fresh install
 * with no gateway connected shows honest empty states rather than padding.
 */
export async function getBillingOverview(statusFilter?: SubscriptionInvoice['status']): Promise<BillingOverview> {
    const db = service()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    let recentQuery = db
        .from('gym_subscription_invoices')
        .select('*, gym:gyms(name)')
        .order('issued_at', { ascending: false })
        .limit(50)
    if (statusFilter) recentQuery = recentQuery.eq('status', statusFilter)

    const [tenants, openResult, paidResult, failedResult, recentResult] = await Promise.all([
        getTenantSummaries(),
        db.from('gym_subscription_invoices').select('gym_id, amount_due, amount_paid, due_at').eq('status', 'open'),
        db.from('gym_subscription_invoices').select('amount_paid').eq('status', 'paid').gte('paid_at', monthStart),
        db.from('gym_subscription_invoices').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
        recentQuery,
    ])

    const openInvoices = (openResult.data ?? []) as Array<{
        gym_id: string
        amount_due: unknown
        amount_paid: unknown
        due_at: string | null
    }>
    const paidInvoices = (paidResult.data ?? []) as Array<{ amount_paid: unknown }>

    // Open balance and overdue-ness per gym, so the collections list can be
    // built from the tenant list without a second pass over invoices.
    const openByGym = new Map<string, { owed: number; daysOverdue: number | null }>()
    for (const invoice of openInvoices) {
        const current = openByGym.get(invoice.gym_id) ?? { owed: 0, daysOverdue: null }
        current.owed += Math.max(Number(invoice.amount_due ?? 0) - Number(invoice.amount_paid ?? 0), 0)
        const remaining = daysUntil(invoice.due_at)
        if (remaining !== null && remaining < 0) {
            const overdue = -remaining
            current.daysOverdue = current.daysOverdue === null ? overdue : Math.max(current.daysOverdue, overdue)
        }
        openByGym.set(invoice.gym_id, current)
    }

    const collections: BillingCollection[] = tenants
        .flatMap((tenant) => {
            const open = openByGym.get(tenant.id)
            const failedAttempts = Number(tenant.subscription?.failed_payment_count ?? 0)
            const pastDue = tenant.subscription?.status === 'past_due'
            const overdue = open?.daysOverdue !== null && open?.daysOverdue !== undefined
            if (!pastDue && failedAttempts === 0 && !overdue) return []
            return [
                {
                    tenant,
                    owed: open?.owed ?? 0,
                    daysOverdue: open?.daysOverdue ?? null,
                    failedAttempts,
                },
            ]
        })
        .sort((a, b) => b.owed - a.owed || (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0))

    const renewals: BillingRenewal[] = tenants
        .flatMap((tenant) => {
            const subscription = tenant.subscription
            if (!isBillingRevenue(subscription)) return []
            const remaining = daysUntil(subscription?.current_period_end)
            if (remaining === null || remaining < 0 || remaining > RENEWAL_WINDOW_DAYS) return []
            const months = subscription?.billing_interval === 'annual' ? 12 : 1
            return [{ tenant, amount: tenant.mrr * months, daysUntilRenewal: remaining }]
        })
        .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)

    const trialing = tenants.filter((tenant) => tenant.subscription?.status === 'trialing')

    const invoices = ((recentResult.data ?? []) as Array<SubscriptionInvoice & { gym: { name: string } | null }>).map(
        ({ gym, ...invoice }) => ({ ...invoice, tenantName: gym?.name ?? 'Unknown tenant' }),
    )

    return {
        metrics: {
            collectedThisMonth: paidInvoices.reduce((total, row) => total + Number(row.amount_paid ?? 0), 0),
            collectedCount: paidInvoices.length,
            outstanding: openInvoices.reduce(
                (total, row) => total + Math.max(Number(row.amount_due ?? 0) - Number(row.amount_paid ?? 0), 0),
                0,
            ),
            outstandingCount: openInvoices.length,
            failedInvoices: failedResult.count ?? 0,
            pastDueTenants: tenants.filter((tenant) => tenant.subscription?.status === 'past_due').length,
            // What MRR would become if every current trial converted at its
            // current plan price. Kept visibly separate from real revenue.
            pipeline: trialing.reduce((total, tenant) => total + tenant.mrr, 0),
            trialing: trialing.length,
        },
        collections,
        renewals,
        invoices,
    }
}

export type PlanFeature = {
    id: string
    key: string
    label: string
    description: string | null
    sort_order: number
    is_active: boolean
}

export type PlanWithStats = SubscriptionPlan & {
    tenantCount: number
    mrr: number
    /** Subscriptions on this plan whose frozen entitlements differ from it. */
    driftedTenantCount: number
}

export type PlanCatalog = {
    plans: PlanWithStats[]
    features: PlanFeature[]
}

/**
 * The plan catalogue plus the numbers an operator needs before editing a tier:
 * how many tenants are on it, what it earns, and how many of those tenants are
 * still holding entitlements that no longer match the plan.
 *
 * Drift is not a fault - it is the snapshot doing its job. It is surfaced so
 * that "apply to existing tenants" is a decision with a visible cost rather
 * than a button someone presses hopefully.
 */
export async function getPlanCatalog(): Promise<PlanCatalog> {
    const db = service()

    const [plansResult, featuresResult, subscriptionsResult, tenants] = await Promise.all([
        db.from('platform_subscription_plans').select('*').order('sort_order').order('price_monthly'),
        db.from('platform_plan_features').select('*').eq('is_active', true).order('sort_order'),
        db.from('gym_subscriptions').select('gym_id, plan_id, plan_entitlements'),
        getTenantSummaries(),
    ])

    const plans = (plansResult.data ?? []) as SubscriptionPlan[]
    const subscriptions = (subscriptionsResult.data ?? []) as Array<{
        gym_id: string
        plan_id: string | null
        plan_entitlements: unknown
    }>

    const mrrByGym = new Map(tenants.map((tenant) => [tenant.id, tenant]))

    const stats = new Map<string, { tenants: number; mrr: number; drifted: number }>()
    for (const subscription of subscriptions) {
        if (!subscription.plan_id) continue
        const plan = plans.find((row) => row.id === subscription.plan_id)
        if (!plan) continue

        const current = stats.get(plan.id) ?? { tenants: 0, mrr: 0, drifted: 0 }
        current.tenants += 1

        const tenant = mrrByGym.get(subscription.gym_id)
        if (tenant && isBillingRevenue(tenant.subscription)) current.mrr += tenant.mrr

        if (entitlementsDiffer(subscription.plan_entitlements, plan)) current.drifted += 1

        stats.set(plan.id, current)
    }

    return {
        plans: plans.map((plan) => {
            const row = stats.get(plan.id) ?? { tenants: 0, mrr: 0, drifted: 0 }
            return { ...plan, tenantCount: row.tenants, mrr: row.mrr, driftedTenantCount: row.drifted }
        }),
        features: (featuresResult.data ?? []) as PlanFeature[],
    }
}

/** True when a subscription's frozen entitlements no longer match its plan. */
function entitlementsDiffer(snapshot: unknown, plan: SubscriptionPlan): boolean {
    const resolved = resolveEntitlements(snapshot, plan)
    if (!resolved.fromSnapshot) return false

    if (resolved.maxMembers !== (plan.max_members ?? null)) return true
    if (resolved.maxStaff !== (plan.max_staff ?? null)) return true

    const planFeatures = normalizeFeatureKeys(plan.features)
    if (planFeatures.length !== resolved.features.length) return true

    const held = new Set(resolved.features)
    return planFeatures.some((key) => !held.has(key))
}

export async function getAuditLog(limit = 100): Promise<Array<PlatformAuditLog & { gymName: string | null }>> {
    const db = service()
    const [logsResult, gymsResult] = await Promise.all([
        db.from('platform_audit_logs').select('*').order('created_at', { ascending: false }).limit(limit),
        db.from('gyms').select('id, name'),
    ])

    const gymNames = new Map(
        ((gymsResult.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
    )

    return ((logsResult.data ?? []) as PlatformAuditLog[]).map((log) => ({
        ...log,
        gymName: log.gym_id ? gymNames.get(log.gym_id) ?? null : null,
    }))
}

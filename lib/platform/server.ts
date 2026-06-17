import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { QueryResult, Tables } from '@/lib/types'
import {
    type GymDailyStat,
    type GymFeatureFlag,
    type ImpersonationSession,
    type PlatformAdmin,
    type PlatformAnnouncement,
    type PlatformAuditLog,
    type PlatformDailyStat,
    type PlatformGym,
    type SaaSInvoice,
    type SaaSPlan,
    type SaaSSubscription,
    type SupportTicket,
    type SupportTicketMessage,
    formatPlanFeatureIndex,
    getSubscriptionAmount,
} from '@/lib/platform/types'

type ProfileRecord = Tables<'profiles'>

type PlatformContext = {
    user: User | null
    profile: ProfileRecord | null
    platformAdmin: PlatformAdmin | null
    activeImpersonation: (ImpersonationSession & { gym: Pick<PlatformGym, 'id' | 'name' | 'subdomain'> | null }) | null
}

export type AuthenticatedPlatformContext = PlatformContext & {
    user: User
    platformAdmin: PlatformAdmin
}

type SubscriptionWithPlan = SaaSSubscription & {
    plan?: SaaSPlan | null
}

function adminClient() {
    return getSupabaseAdmin() as any
}

function isUuid(value: string | null | undefined) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function sumMoney(values: Array<number | string | null | undefined>) {
    return values.reduce<number>((total, value) => total + Number(value ?? 0), 0)
}

function isWithinDays(value: string | null | undefined, days: number) {
    if (!value) return false
    const target = new Date(value)
    const now = new Date()
    const max = new Date(now)
    max.setDate(max.getDate() + days)
    return target >= now && target <= max
}

function withPlanAmount(subscription: SubscriptionWithPlan | null | undefined) {
    return getSubscriptionAmount(subscription, subscription?.plan ?? null)
}

async function getPlatformAdminForUser(userId: string) {
    const admin = adminClient()
    const [platformAdminResult, profileResult, impersonationResult] = await Promise.all([
        admin
            .from('platform_admins')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle(),
        admin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
        admin
            .from('impersonation_sessions')
            .select('*, gym:gyms(id, name, subdomain), platform_admin:platform_admins!inner(user_id)')
            .eq('platform_admin.user_id', userId)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ])

    const { data: platformAdmin } = platformAdminResult as QueryResult<PlatformAdmin | null>
    const { data: profile } = profileResult as QueryResult<ProfileRecord | null>
    const { data: activeImpersonation } = impersonationResult as QueryResult<PlatformContext['activeImpersonation']>

    return { profile, platformAdmin, activeImpersonation }
}

export const getCurrentPlatformContext = cache(async (): Promise<PlatformContext> => {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { user: null, profile: null, platformAdmin: null, activeImpersonation: null }
    }

    return { user, ...(await getPlatformAdminForUser(user.id)) }
})

export async function requirePlatformContext(): Promise<AuthenticatedPlatformContext> {
    const context = await getCurrentPlatformContext()
    if (!context.user || !context.platformAdmin) {
        redirect('/platform/login')
    }
    return context as AuthenticatedPlatformContext
}

export async function logPlatformAuditEvent(input: {
    action: string
    entityType: string
    entityId?: string | null
    gymId?: string | null
    oldData?: Record<string, unknown> | null
    newData?: Record<string, unknown> | null
}) {
    const context = await requirePlatformContext()
    const admin = adminClient()
    const requestHeaders = await headers()
    const forwardedFor = requestHeaders.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null
    const userAgent = requestHeaders.get('user-agent')

    await admin.from('platform_audit_log').insert({
        actor_id: context.platformAdmin.id,
        action: input.action,
        entity_type: input.entityType,
        entity_id: isUuid(input.entityId) ? input.entityId : null,
        gym_id: input.gymId ?? null,
        old_data: input.oldData ?? null,
        new_data: {
            ...(input.newData ?? {}),
            ...(input.entityId && !isUuid(input.entityId) ? { rawEntityId: input.entityId } : {}),
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        is_impersonation: Boolean(context.activeImpersonation),
        impersonation_session_id: context.activeImpersonation?.id ?? null,
    } as never)
}

export async function getPlatformDashboardData() {
    const admin = adminClient()
    const [
        gymsResult,
        membersResult,
        subscriptionsResult,
        invoicesResult,
        ticketsResult,
        announcementsResult,
        auditLogsResult,
        statsResult,
    ] = await Promise.all([
        admin.from('gyms').select('*').order('created_at', { ascending: false }),
        admin.from('members').select('id, gym_id, created_at'),
        admin.from('saas_subscriptions').select('*, plan:saas_plans(*)').order('created_at', { ascending: false }),
        admin.from('saas_invoices').select('*').order('created_at', { ascending: false }).limit(12),
        admin.from('support_tickets').select('*').order('updated_at', { ascending: false }).limit(12),
        admin.from('platform_announcements').select('*').eq('is_published', true).order('publish_at', { ascending: false }).limit(5),
        admin.from('platform_audit_log').select('*').order('created_at', { ascending: false }).limit(20),
        admin.from('platform_daily_stats').select('*').order('stat_date', { ascending: false }).limit(30),
    ])

    const gyms = (gymsResult.data ?? []) as PlatformGym[]
    const members = (membersResult.data ?? []) as Array<Pick<Tables<'members'>, 'id' | 'gym_id' | 'created_at'>>
    const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionWithPlan[]
    const invoices = (invoicesResult.data ?? []) as SaaSInvoice[]
    const tickets = (ticketsResult.data ?? []) as SupportTicket[]
    const announcements = (announcementsResult.data ?? []) as PlatformAnnouncement[]
    const auditLogs = (auditLogsResult.data ?? []) as PlatformAuditLog[]
    const platformStats = (statsResult.data ?? []) as PlatformDailyStat[]

    const latestSnapshot = platformStats[0] ?? null
    const mrr = latestSnapshot?.mrr ?? sumMoney(subscriptions.map(withPlanAmount))
    const arr = latestSnapshot?.arr ?? mrr * 12
    const totalGyms = latestSnapshot?.total_gyms ?? gyms.length
    const totalMembers = latestSnapshot?.total_members_all ?? members.length
    const newGyms = latestSnapshot?.new_gyms ?? gyms.filter((gym) => {
        const createdAt = new Date(gym.created_at)
        const since = new Date()
        since.setDate(since.getDate() - 30)
        return createdAt >= since
    }).length
    const churnedGyms = latestSnapshot?.churned_gyms ?? gyms.filter((gym) => gym.platform_status === 'cancelled').length
    const expiringTrials = gyms.filter((gym) => gym.platform_status === 'trialing' && isWithinDays(gym.trial_ends_at, 14))
    const failedPayments = invoices.filter((invoice) => invoice.status === 'overdue')

    const recentActivity = [
        ...gyms.slice(0, 4).map((gym) => ({
            id: `gym-${gym.id}`,
            type: 'gym_signup',
            title: `${gym.name} joined the platform`,
            timestamp: gym.created_at,
        })),
        ...invoices.slice(0, 4).map((invoice) => ({
            id: `invoice-${invoice.id}`,
            type: 'invoice',
            title: `Invoice ${invoice.invoice_number} moved to ${invoice.status}`,
            timestamp: invoice.updated_at,
        })),
        ...tickets.slice(0, 4).map((ticket) => ({
            id: `ticket-${ticket.id}`,
            type: 'ticket',
            title: `${ticket.ticket_number} is ${ticket.status.replace(/_/g, ' ')}`,
            timestamp: ticket.updated_at,
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return {
        gyms,
        members,
        subscriptions,
        invoices,
        tickets,
        announcements,
        auditLogs,
        platformStats: platformStats.slice().reverse(),
        metrics: { totalGyms, totalMembers, mrr, arr, newGyms, churnedGyms },
        alerts: { expiringTrials, failedPayments },
        recentActivity,
    }
}

export async function getPlatformGyms(query?: string) {
    const admin = adminClient()
    const [gymsResult, subscriptionsResult, ticketsResult, membersResult, dailyStatsResult] = await Promise.all([
        admin.from('gyms').select('*').order('created_at', { ascending: false }),
        admin.from('saas_subscriptions').select('*, plan:saas_plans(*)'),
        admin.from('support_tickets').select('id, gym_id, status, updated_at'),
        admin.from('members').select('id, gym_id'),
        admin.from('gym_daily_stats').select('*').order('stat_date', { ascending: false }),
    ])

    const gyms = (gymsResult.data ?? []) as PlatformGym[]
    const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionWithPlan[]
    const tickets = (ticketsResult.data ?? []) as Array<Pick<SupportTicket, 'id' | 'gym_id' | 'status' | 'updated_at'>>
    const members = (membersResult.data ?? []) as Array<Pick<Tables<'members'>, 'id' | 'gym_id'>>
    const dailyStats = (dailyStatsResult.data ?? []) as GymDailyStat[]

    const subscriptionMap = new Map<string, SubscriptionWithPlan>()
    const memberCountMap = new Map<string, number>()
    const ticketCountMap = new Map<string, number>()
    const snapshotMap = new Map<string, GymDailyStat>()

    for (const subscription of subscriptions) {
        if (!subscriptionMap.has(subscription.gym_id)) {
            subscriptionMap.set(subscription.gym_id, subscription)
        }
    }
    for (const member of members) {
        memberCountMap.set(member.gym_id, (memberCountMap.get(member.gym_id) ?? 0) + 1)
    }
    for (const ticket of tickets) {
        if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
            ticketCountMap.set(ticket.gym_id, (ticketCountMap.get(ticket.gym_id) ?? 0) + 1)
        }
    }
    for (const stat of dailyStats) {
        if (!snapshotMap.has(stat.gym_id)) {
            snapshotMap.set(stat.gym_id, stat)
        }
    }

    return gyms
        .filter((gym) => {
            if (!query) return true
            const haystack = [
                gym.name,
                gym.business_name,
                gym.contact_email,
                gym.subdomain,
                gym.slug,
                gym.city,
                gym.state,
                gym.country,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return haystack.includes(query.toLowerCase())
        })
        .map((gym) => {
            const subscription = subscriptionMap.get(gym.id) ?? null
            const latestStat = snapshotMap.get(gym.id) ?? null
            return {
                ...gym,
                memberCount: memberCountMap.get(gym.id) ?? latestStat?.total_members ?? 0,
                openTickets: ticketCountMap.get(gym.id) ?? 0,
                latestStat,
                subscription,
                mrr: withPlanAmount(subscription),
            }
        })
}

export async function getPlatformGymDetail(gymId: string) {
    const admin = adminClient()
    const [
        gymResult,
        membersResult,
        subscriptionResult,
        ticketsResult,
        invoicesResult,
        featureFlagsResult,
        adminsResult,
        activityResult,
        dailyStatsResult,
    ] = await Promise.all([
        admin.from('gyms').select('*').eq('id', gymId).maybeSingle(),
        admin.from('members').select('id, full_name, created_at, status').eq('gym_id', gymId).order('created_at', { ascending: false }),
        admin.from('saas_subscriptions').select('*, plan:saas_plans(*)').eq('gym_id', gymId).maybeSingle(),
        admin.from('support_tickets').select('*').eq('gym_id', gymId).order('updated_at', { ascending: false }),
        admin.from('saas_invoices').select('*').eq('gym_id', gymId).order('created_at', { ascending: false }),
        admin.from('gym_feature_flags').select('*').eq('gym_id', gymId).order('flag_key'),
        admin.from('admins').select('*, profile:profiles(full_name)').eq('gym_id', gymId).order('created_at'),
        admin.from('platform_audit_log').select('*').eq('gym_id', gymId).order('created_at', { ascending: false }).limit(20),
        admin.from('gym_daily_stats').select('*').eq('gym_id', gymId).order('stat_date', { ascending: false }).limit(14),
    ])

    return {
        gym: gymResult.data as PlatformGym | null,
        members: (membersResult.data ?? []) as Array<Pick<Tables<'members'>, 'id' | 'full_name' | 'created_at' | 'status'>>,
        subscription: subscriptionResult.data as SubscriptionWithPlan | null,
        tickets: (ticketsResult.data ?? []) as SupportTicket[],
        invoices: (invoicesResult.data ?? []) as SaaSInvoice[],
        featureFlags: (featureFlagsResult.data ?? []) as GymFeatureFlag[],
        admins: (adminsResult.data ?? []) as Array<Tables<'admins'> & { profile?: { full_name: string } | null }>,
        activity: (activityResult.data ?? []) as PlatformAuditLog[],
        dailyStats: ((dailyStatsResult.data ?? []) as GymDailyStat[]).slice().reverse(),
    }
}

export async function getPlatformSupportData() {
    const admin = adminClient()
    const [ticketsResult, messagesResult, gymsResult, platformAdminsResult] = await Promise.all([
        admin.from('support_tickets').select('*').order('updated_at', { ascending: false }),
        admin.from('support_ticket_messages').select('*').order('created_at', { ascending: false }),
        admin.from('gyms').select('id, name'),
        admin.from('platform_admins').select('*').eq('is_active', true).order('full_name'),
    ])

    return {
        tickets: (ticketsResult.data ?? []) as SupportTicket[],
        messages: (messagesResult.data ?? []) as SupportTicketMessage[],
        gyms: (gymsResult.data ?? []) as Array<Pick<PlatformGym, 'id' | 'name'>>,
        platformAdmins: (platformAdminsResult.data ?? []) as PlatformAdmin[],
    }
}

export async function getPlatformSettingsData() {
    const admin = adminClient()
    const [plansResult, overridesResult, announcementsResult, auditLogsResult, adminsResult] = await Promise.all([
        admin.from('saas_plans').select('*').order('sort_order'),
        admin.from('gym_feature_flags').select('*').order('updated_at', { ascending: false }),
        admin.from('platform_announcements').select('*').order('created_at', { ascending: false }).limit(50),
        admin.from('platform_audit_log').select('*').order('created_at', { ascending: false }).limit(100),
        admin.from('platform_admins').select('*').order('created_at'),
    ])

    const plans = (plansResult.data ?? []) as SaaSPlan[]

    return {
        plans,
        planFeatures: formatPlanFeatureIndex(plans),
        overrides: (overridesResult.data ?? []) as GymFeatureFlag[],
        announcements: (announcementsResult.data ?? []) as PlatformAnnouncement[],
        auditLogs: (auditLogsResult.data ?? []) as PlatformAuditLog[],
        admins: (adminsResult.data ?? []) as PlatformAdmin[],
    }
}

export async function recordSystemEvent(source: string, severity: string, message: string, details: Record<string, unknown> = {}) {
    const admin = adminClient()
    try {
        const actorResult = await admin.from('platform_admins').select('id').eq('is_active', true).limit(1).maybeSingle()
        if (!actorResult.data?.id) return

        await admin.from('platform_audit_log').insert({
            actor_id: actorResult.data.id,
            action: `system.${severity}`,
            entity_type: 'system_event',
            entity_id: null,
            gym_id: null,
            old_data: null,
            new_data: { source, message, details },
            ip_address: null,
            user_agent: 'system',
            is_impersonation: false,
            impersonation_session_id: null,
        } as never)
    } catch {
        // Compatibility shim: platform logging is best-effort for non-interactive jobs.
    }
}

export async function recordBackgroundJobRun(input: {
    jobName: string
    status: string
    details?: Record<string, unknown>
    startedAt?: string
    finishedAt?: string | null
}) {
    await recordSystemEvent('background-job', input.status, input.jobName, {
        ...(input.details ?? {}),
        startedAt: input.startedAt ?? new Date().toISOString(),
        finishedAt: input.finishedAt ?? null,
    })
}

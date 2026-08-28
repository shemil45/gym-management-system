import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type {
    ImpersonationSession,
    PlatformAdminIdentity,
    PlatformAdminRecord,
    PlatformRole,
} from '@/lib/platform/types'

/**
 * Platform-admin identity, resolved independently of gym context.
 *
 * This separation is the point of the module. Previously, impersonation
 * sessions were folded into the same `accessibleGyms` map that answers "is
 * this user really staff at this gym", so a support session and a real
 * membership were indistinguishable downstream. Here, platform identity is
 * resolved on its own; the only crossover is `startImpersonation`, which
 * writes an explicit, expiring, audited row.
 */

type PlatformSession = {
    user: User | null
    admin: PlatformAdminIdentity | null
    impersonation: (ImpersonationSession & { gymName: string | null }) | null
}

export type AuthenticatedPlatformSession = PlatformSession & {
    user: User
    admin: PlatformAdminIdentity
}

/** Capabilities per platform role. Checked in actions, not just hidden in UI. */
const ROLE_CAPABILITIES: Record<PlatformRole, string[]> = {
    owner: ['tenant:write', 'billing:write', 'flags:write', 'impersonate', 'admins:write'],
    billing_admin: ['billing:write', 'tenant:write'],
    support_agent: ['impersonate', 'tenant:write'],
    analyst: [],
}

export function roleCan(role: PlatformRole, capability: string): boolean {
    return ROLE_CAPABILITIES[role]?.includes(capability) ?? false
}

/**
 * Resolves the signed-in user's platform-admin record, if any.
 *
 * Uses the service-role client for the `platform_admins` lookup because a
 * user who is NOT a platform admin must still get a clean `null` rather than
 * an RLS error, and because `profiles` is gym-scoped under RLS while platform
 * admins are deliberately outside any tenant.
 */
export const getPlatformSession = cache(async (): Promise<PlatformSession> => {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { user: null, admin: null, impersonation: null }
    }

    const service = getSupabaseAdmin()

    const adminResult = await service
        .from('platform_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

    const record = adminResult.data as PlatformAdminRecord | null

    if (!record) {
        return { user, admin: null, impersonation: null }
    }

    const [profileResult, impersonationResult] = await Promise.all([
        service.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        service
            .from('platform_impersonation_sessions')
            .select('*, gym:gyms(name)')
            .eq('platform_admin_id', record.id)
            .is('ended_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ])

    const profile = profileResult.data as { full_name: string } | null
    const rawImpersonation = impersonationResult.data as
        | (ImpersonationSession & { gym: { name: string } | null })
        | null

    return {
        user,
        admin: {
            ...record,
            full_name: profile?.full_name ?? user.email?.split('@')[0] ?? 'Platform admin',
            email: user.email ?? null,
        },
        impersonation: rawImpersonation
            ? { ...rawImpersonation, gymName: rawImpersonation.gym?.name ?? null }
            : null,
    }
})

/** Route guard for every page under /platform/(portal). */
export async function requirePlatformSession(): Promise<AuthenticatedPlatformSession> {
    const session = await getPlatformSession()

    if (!session.user || !session.admin) {
        redirect('/platform/login')
    }

    return session as AuthenticatedPlatformSession
}

/**
 * Guard for mutating Server Actions.
 *
 * Every write in this portal calls this rather than trusting that the UI hid
 * the control: hiding a button is a presentation choice, not an access one.
 */
export async function requireCapability(capability: string): Promise<AuthenticatedPlatformSession> {
    const session = await requirePlatformSession()

    if (!roleCan(session.admin.role, capability)) {
        throw new Error(
            `Your platform role (${session.admin.role}) cannot perform this action.`,
        )
    }

    return session
}

/**
 * Appends to the platform audit trail.
 *
 * Called after every state-changing action. Failures here are logged but not
 * thrown: losing an audit line must not roll back the operation the operator
 * just confirmed, and a silent rollback would be worse than a gap in the log.
 */
export async function recordAudit(input: {
    action: string
    entityType: string
    entityId?: string | null
    gymId?: string | null
    metadata?: Record<string, unknown>
}): Promise<void> {
    try {
        const session = await getPlatformSession()
        const service = getSupabaseAdmin()
        const requestHeaders = await headers()
        const forwardedFor = requestHeaders.get('x-forwarded-for')

        await service.from('platform_audit_logs').insert({
            actor_user_id: session.user?.id ?? null,
            actor_platform_admin_id: session.admin?.id ?? null,
            action: input.action,
            entity_type: input.entityType,
            entity_id: input.entityId ?? null,
            gym_id: input.gymId ?? null,
            metadata: {
                ...(input.metadata ?? {}),
                // Impersonated writes are tagged so the trail can answer
                // "was this done as support, or by the tenant themselves".
                is_impersonation: Boolean(session.impersonation),
                impersonation_session_id: session.impersonation?.id ?? null,
            },
            ip_address: forwardedFor?.split(',')[0]?.trim() || null,
            user_agent: requestHeaders.get('user-agent'),
        } as never)
    } catch (error) {
        console.error('[platform] Failed to write audit log', {
            action: input.action,
            error: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * System-level event recorder used by non-interactive jobs (cron).
 *
 * Kept as a distinct entry point from `recordAudit` because there is no
 * platform admin to attribute a cron run to, and forcing one would make the
 * audit trail lie about who acted.
 */
export async function recordSystemEvent(
    source: string,
    severity: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    details: Record<string, unknown> = {},
): Promise<void> {
    try {
        const service = getSupabaseAdmin()
        await service.from('system_events').insert({
            source,
            severity,
            message,
            details,
        } as never)
    } catch {
        // Best-effort: a monitoring write must never fail the job it monitors.
    }
}

export async function recordBackgroundJobRun(input: {
    jobName: string
    status: 'queued' | 'running' | 'completed' | 'failed'
    details?: Record<string, unknown>
    startedAt?: string
    finishedAt?: string | null
}): Promise<void> {
    try {
        const service = getSupabaseAdmin()
        await service.from('background_job_runs').insert({
            job_name: input.jobName,
            status: input.status,
            started_at: input.startedAt ?? new Date().toISOString(),
            finished_at: input.finishedAt ?? null,
            details: input.details ?? {},
        } as never)
    } catch {
        // Best-effort, same reasoning as recordSystemEvent.
    }
}

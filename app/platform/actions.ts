'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
    getPlatformSession,
    recordAudit,
    requireCapability,
    requirePlatformSession,
} from '@/lib/platform/auth'
import {
    PLAN_ENTITLEMENT_COLUMNS,
    buildEntitlementSnapshot,
    type PlanEntitlementSource,
} from '@/lib/billing/plan-entitlements'
import type { GymPlatformStatus, PlatformAdminRecord } from '@/lib/platform/types'

export type ActionState = { error: string | null; success?: string | null }

/**
 * Platform sign-in.
 *
 * Verification happens server-side with the service-role client rather than
 * client-side like the tenant portals: this is the highest-privilege surface
 * in the product, so "are you a platform admin" is answered where the answer
 * cannot be tampered with. A user who authenticates but is not an active
 * platform admin has their session dropped immediately, mirroring the
 * cross-portal rejection the admin and member logins already enforce.
 */
export async function signInToPlatform(
    _prevState: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!email || !password) {
        return { error: 'Enter your email and password.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
        // Deliberately does not distinguish "no such user" from "wrong
        // password" - on an admin console that difference is an account
        // enumeration oracle.
        return { error: 'Those credentials did not match an account.' }
    }

    const service = getSupabaseAdmin()
    const adminResult = await service
        .from('platform_admins')
        .select('id, is_active')
        .eq('user_id', data.user.id)
        .maybeSingle()

    const record = adminResult.data as Pick<PlatformAdminRecord, 'id' | 'is_active'> | null

    if (!record || !record.is_active) {
        await supabase.auth.signOut()
        return {
            error: record
                ? 'This platform account has been deactivated. Contact a platform owner.'
                : 'This account does not have platform access.',
        }
    }

    await service
        .from('platform_admins')
        .update({ last_login_at: new Date().toISOString() } as never)
        .eq('id', record.id)

    await recordAudit({ action: 'platform.sign_in', entityType: 'platform_admin', entityId: record.id })

    redirect('/platform')
}

export async function signOutOfPlatform(): Promise<void> {
    const supabase = await createClient()
    await recordAudit({ action: 'platform.sign_out', entityType: 'platform_admin' })
    await supabase.auth.signOut()
    redirect('/platform/login')
}

/**
 * Moves a tenant through the lifecycle state machine.
 *
 * Suspension is reversible and never deletes tenant data - it only gates
 * access. `suspended_at` and `suspension_reason` are written together so the
 * directory can always explain why a tenant is dark.
 */
export async function setTenantStatus(formData: FormData): Promise<void> {
    const session = await requireCapability('tenant:write')

    const gymId = String(formData.get('gymId') ?? '')
    const status = String(formData.get('status') ?? '') as GymPlatformStatus
    const reason = String(formData.get('reason') ?? '').trim()

    if (!gymId || !['active', 'trialing', 'suspended', 'cancelled'].includes(status)) {
        throw new Error('Pick a valid tenant status.')
    }

    if ((status === 'suspended' || status === 'cancelled') && !reason) {
        throw new Error('A reason is required when suspending or cancelling a tenant.')
    }

    const service = getSupabaseAdmin()
    const previous = await service.from('gyms').select('platform_status').eq('id', gymId).maybeSingle()

    const isDark = status === 'suspended' || status === 'cancelled'

    const { error } = await service
        .from('gyms')
        .update({
            platform_status: status,
            // is_active mirrors platform_status so tenant-side code that still
            // reads the older boolean stays consistent with the new field.
            is_active: !isDark,
            suspended_at: status === 'suspended' ? new Date().toISOString() : null,
            suspension_reason: isDark ? reason : null,
        } as never)
        .eq('id', gymId)

    if (error) throw new Error(error.message)

    await recordAudit({
        action: `tenant.status.${status}`,
        entityType: 'gym',
        entityId: gymId,
        gymId,
        metadata: {
            from: (previous.data as { platform_status: string } | null)?.platform_status ?? null,
            to: status,
            reason: reason || null,
            actor_role: session.admin.role,
        },
    })

    revalidatePath('/platform')
    revalidatePath('/platform/tenants')
    revalidatePath(`/platform/tenants/${gymId}`)
}

/**
 * Opens a time-boxed support session against one tenant.
 *
 * The session row is the ONLY crossover between platform identity and tenant
 * access. It expires on its own (schema default: 2 hours), requires a written
 * reason, and every write made while it is open is tagged in the audit trail.
 */
export async function startImpersonation(formData: FormData): Promise<void> {
    const session = await requireCapability('impersonate')

    const gymId = String(formData.get('gymId') ?? '')
    const reason = String(formData.get('reason') ?? '').trim()

    if (!gymId) throw new Error('Pick a tenant to open a support session for.')
    if (reason.length < 8) {
        throw new Error('Describe why you need support access (at least 8 characters). This is recorded.')
    }

    const service = getSupabaseAdmin()

    // Close any session already open for this admin, so "which gym am I in"
    // always has exactly one answer.
    await service
        .from('platform_impersonation_sessions')
        .update({ ended_at: new Date().toISOString() } as never)
        .eq('platform_admin_id', session.admin.id)
        .is('ended_at', null)

    const { error } = await service.from('platform_impersonation_sessions').insert({
        platform_admin_id: session.admin.id,
        gym_id: gymId,
        started_by_user_id: session.user.id,
        reason,
    } as never)

    if (error) throw new Error(error.message)

    await recordAudit({
        action: 'tenant.impersonation.start',
        entityType: 'gym',
        entityId: gymId,
        gymId,
        metadata: { reason },
    })

    revalidatePath('/platform', 'layout')
    redirect('/admin/dashboard')
}

export async function stopImpersonation(): Promise<void> {
    const session = await getPlatformSession()

    if (session.admin) {
        const service = getSupabaseAdmin()
        await service
            .from('platform_impersonation_sessions')
            .update({ ended_at: new Date().toISOString() } as never)
            .eq('platform_admin_id', session.admin.id)
            .is('ended_at', null)

        await recordAudit({
            action: 'tenant.impersonation.stop',
            entityType: 'gym',
            entityId: session.impersonation?.gym_id ?? null,
            gymId: session.impersonation?.gym_id ?? null,
        })
    }

    revalidatePath('/', 'layout')
    redirect('/platform')
}

/**
 * Sets or clears one tenant's override for one feature flag.
 *
 * "inherit" deletes the row rather than writing `false`, because inheriting
 * the platform default and being explicitly switched off are different facts
 * and the matrix has to be able to show which one is true.
 */
export async function setFeatureOverride(formData: FormData): Promise<void> {
    await requireCapability('flags:write')

    const gymId = String(formData.get('gymId') ?? '')
    const flagId = String(formData.get('flagId') ?? '')
    const value = String(formData.get('value') ?? '')

    if (!gymId || !flagId) throw new Error('Pick a tenant and a flag.')

    const service = getSupabaseAdmin()

    if (value === 'inherit') {
        const { error } = await service
            .from('gym_feature_overrides')
            .delete()
            .eq('gym_id', gymId)
            .eq('feature_flag_id', flagId)

        if (error) throw new Error(error.message)
    } else {
        const { error } = await service.from('gym_feature_overrides').upsert(
            {
                gym_id: gymId,
                feature_flag_id: flagId,
                is_enabled: value === 'on',
            } as never,
            { onConflict: 'gym_id,feature_flag_id' },
        )

        if (error) throw new Error(error.message)
    }

    await recordAudit({
        action: 'flag.override.set',
        entityType: 'feature_flag',
        entityId: flagId,
        gymId,
        metadata: { value },
    })

    revalidatePath('/platform/flags')
    revalidatePath(`/platform/tenants/${gymId}`)
}

/** Flips the platform-wide default for a flag. Affects every tenant without an override. */
export async function setFlagDefault(formData: FormData): Promise<void> {
    await requireCapability('flags:write')

    const flagId = String(formData.get('flagId') ?? '')
    const enabled = String(formData.get('enabled') ?? '') === 'true'

    if (!flagId) throw new Error('Pick a flag.')

    const service = getSupabaseAdmin()
    const { error } = await service
        .from('platform_feature_flags')
        .update({ is_enabled: enabled } as never)
        .eq('id', flagId)

    if (error) throw new Error(error.message)

    await recordAudit({
        action: 'flag.default.set',
        entityType: 'feature_flag',
        entityId: flagId,
        metadata: { enabled },
    })

    revalidatePath('/platform/flags')
}

/** Moves a tenant onto a different plan and/or billing interval. */
export async function updateTenantSubscription(formData: FormData): Promise<void> {
    const session = await requireCapability('billing:write')

    const gymId = String(formData.get('gymId') ?? '')
    const planId = String(formData.get('planId') ?? '')
    const interval = String(formData.get('billingInterval') ?? 'monthly')
    const status = String(formData.get('status') ?? '')
    const discount = Number(formData.get('discountPercentage') ?? 0)

    if (!gymId) throw new Error('Pick a tenant.')
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
        throw new Error('Discount must be between 0 and 100.')
    }

    const service = getSupabaseAdmin()

    // Prices AND entitlements are copied from the plan onto the subscription so
    // a later plan edit does not silently re-rate or re-entitle every existing
    // tenant. See lib/billing/plan-entitlements.ts.
    const planResult = await service
        .from('platform_subscription_plans')
        .select(`price_monthly, price_annual, ${PLAN_ENTITLEMENT_COLUMNS}`)
        .eq('id', planId)
        .maybeSingle()

    const plan = planResult.data as
        | ({ price_monthly: number; price_annual: number } & PlanEntitlementSource)
        | null
    if (!plan) throw new Error('That plan no longer exists.')

    const { error } = await service
        .from('gym_subscriptions')
        .update({
            plan_id: planId,
            billing_interval: interval,
            status,
            monthly_price: plan.price_monthly,
            annual_price: plan.price_annual,
            discount_percentage: discount,
            plan_entitlements: buildEntitlementSnapshot(plan),
            plan_entitlements_set_at: new Date().toISOString(),
        } as never)
        .eq('gym_id', gymId)

    if (error) throw new Error(error.message)

    await recordAudit({
        action: 'billing.subscription.update',
        entityType: 'gym_subscription',
        entityId: gymId,
        gymId,
        metadata: { planId, interval, status, discount, actor_role: session.admin.role },
    })

    revalidatePath('/platform/billing')
    revalidatePath(`/platform/tenants/${gymId}`)
}

/** Marks onboarding complete once the gating fields are filled in. */
export async function completeTenantOnboarding(formData: FormData): Promise<void> {
    await requireCapability('tenant:write')

    const gymId = String(formData.get('gymId') ?? '')
    if (!gymId) throw new Error('Pick a tenant.')

    const service = getSupabaseAdmin()
    const gymResult = await service
        .from('gyms')
        .select('contact_email, contact_phone, subdomain')
        .eq('id', gymId)
        .maybeSingle()

    const gym = gymResult.data as {
        contact_email: string | null
        contact_phone: string | null
        subdomain: string | null
    } | null

    if (!gym) throw new Error('That tenant no longer exists.')

    // The gate is deliberately narrow: contact route plus a claimed subdomain.
    // Everything else stays optional so onboarding cannot stall on cosmetics.
    const missing = [
        !gym.contact_email && 'contact email',
        !gym.contact_phone && 'contact phone',
        !gym.subdomain && 'subdomain',
    ].filter(Boolean)

    if (missing.length > 0) {
        throw new Error(`Still missing: ${missing.join(', ')}.`)
    }

    const { error } = await service
        .from('gyms')
        .update({
            onboarding_status: 'completed',
            onboarding_completed_at: new Date().toISOString(),
        } as never)
        .eq('id', gymId)

    if (error) throw new Error(error.message)

    await recordAudit({
        action: 'tenant.onboarding.complete',
        entityType: 'gym',
        entityId: gymId,
        gymId,
    })

    revalidatePath(`/platform/tenants/${gymId}`)
    revalidatePath('/platform')
}

/** Saves the operator's private notes on a tenant. */
export async function saveTenantNotes(formData: FormData): Promise<void> {
    await requireCapability('tenant:write')

    const gymId = String(formData.get('gymId') ?? '')
    const notes = String(formData.get('notes') ?? '').trim()

    if (!gymId) throw new Error('Pick a tenant.')

    const service = getSupabaseAdmin()
    const { error } = await service
        .from('gyms')
        .update({ platform_notes: notes || null } as never)
        .eq('id', gymId)

    if (error) throw new Error(error.message)

    await recordAudit({ action: 'tenant.notes.save', entityType: 'gym', entityId: gymId, gymId })
    revalidatePath(`/platform/tenants/${gymId}`)
}

/** Re-exported so the tenant-side admin layout can end a session it is inside of. */
export async function ensurePlatformSession() {
    return requirePlatformSession()
}

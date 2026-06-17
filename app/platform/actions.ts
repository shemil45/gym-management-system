'use server'

import { createHash, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logPlatformAuditEvent, requirePlatformContext } from '@/lib/platform/server'
import type { Tables, UpdateTables } from '@/lib/types'
import type { PlatformGym, SaaSPlan, SaaSSubscription } from '@/lib/platform/types'

function adminClient() {
    return getSupabaseAdmin() as any
}

function getMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

function fail(message: string): never {
    throw new Error(message)
}

export async function loginPlatform(formData: FormData): Promise<void> {
    const supabase = await createClient()
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')

    if (!email || !password) {
        fail('Email and password are required.')
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) fail(error.message)

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) fail('Could not establish a platform session.')

    const admin = adminClient()
    let platformAdminResult = await admin
        .from('platform_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

    if (!platformAdminResult.data) {
        const existingAdminsResult = await admin
            .from('platform_admins')
            .select('id')
            .limit(1)

        if (!existingAdminsResult.error && (existingAdminsResult.data?.length ?? 0) === 0) {
            const profileResult = await admin
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .maybeSingle()

            const bootstrapResult = await admin
                .from('platform_admins')
                .insert({
                    user_id: user.id,
                    full_name: profileResult.data?.full_name || user.email || 'Platform Owner',
                    email: user.email || email,
                    role: 'owner',
                    is_active: true,
                } as never)
                .select('id')
                .single()

            if (!bootstrapResult.error && bootstrapResult.data) {
                platformAdminResult = { data: bootstrapResult.data, error: null }
            }
        }
    }

    if (platformAdminResult.error || !platformAdminResult.data) {
        await supabase.auth.signOut()
        fail('This account is not authorized for the platform portal.')
    }

    await admin
        .from('platform_admins')
        .update({ last_sign_in_at: new Date().toISOString() } as never)
        .eq('id', platformAdminResult.data.id)

    redirect('/platform')
}

export async function signOutPlatform(): Promise<void> {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/platform/login')
}

export async function updateGymStatus(formData: FormData): Promise<void> {
    const context = await requirePlatformContext()
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const status = String(formData.get('status') ?? '') as Tables<'gyms'>['platform_status']
    const reason = String(formData.get('reason') ?? '').trim()

    const payload: UpdateTables<'gyms'> = {
        platform_status: status,
        is_active: status !== 'suspended' && status !== 'cancelled',
        suspended_at: status === 'suspended' ? new Date().toISOString() : null,
        suspension_reason: status === 'suspended' ? reason || null : null,
    }

    const { error } = await admin.from('gyms').update(payload as never).eq('id', gymId)
    if (error) fail(error.message)

    await logPlatformAuditEvent({
        action: 'gym.status.updated',
        entityType: 'gym',
        entityId: gymId,
        gymId,
        newData: { actorRole: context.platformAdmin.role, status, reason: reason || null },
    })

    revalidatePath('/platform')
    revalidatePath('/platform/gyms')
    revalidatePath(`/platform/gyms/${gymId}`)
}

export async function extendGymTrial(formData: FormData): Promise<void> {
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const extraDays = Number(formData.get('extra_days') ?? 0)
    if (!extraDays || extraDays < 1) fail('Enter a valid number of days.')

    const gymResult = await admin.from('gyms').select('id, trial_ends_at').eq('id', gymId).maybeSingle()
    const gym = gymResult.data as Pick<PlatformGym, 'id' | 'trial_ends_at'> | null
    if (!gym) fail('Gym not found.')

    const baseDate = gym.trial_ends_at ? new Date(gym.trial_ends_at) : new Date()
    baseDate.setDate(baseDate.getDate() + extraDays)

    const { error } = await admin
        .from('gyms')
        .update({ trial_ends_at: baseDate.toISOString(), platform_status: 'trialing' } as never)
        .eq('id', gymId)

    if (error) fail(error.message)

    await logPlatformAuditEvent({
        action: 'gym.trial.extended',
        entityType: 'gym',
        entityId: gymId,
        gymId,
        newData: { extraDays, trialEndsAt: baseDate.toISOString() },
    })

    revalidatePath('/platform')
    revalidatePath('/platform/billing')
    revalidatePath(`/platform/gyms/${gymId}`)
}

export async function updateGymNotes(formData: FormData): Promise<void> {
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const notes = String(formData.get('notes') ?? '')

    const { error } = await admin.from('gyms').update({ platform_notes: notes || null } as never).eq('id', gymId)
    if (error) fail(error.message)

    await logPlatformAuditEvent({
        action: 'gym.notes.updated',
        entityType: 'gym',
        entityId: gymId,
        gymId,
        newData: { notes },
    })

    revalidatePath(`/platform/gyms/${gymId}`)
}

export async function updateGymSubscription(formData: FormData): Promise<void> {
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const planId = String(formData.get('plan_id') ?? '')
    const status = String(formData.get('status') ?? '') as SaaSSubscription['status']
    const billingCycle = String(formData.get('billing_cycle') ?? 'monthly') as SaaSSubscription['billing_cycle']
    const discountPct = Number(formData.get('discount_pct') ?? 0)

    const [planResult, existingResult] = await Promise.all([
        admin.from('saas_plans').select('*').eq('id', planId).maybeSingle(),
        admin.from('saas_subscriptions').select('*').eq('gym_id', gymId).maybeSingle(),
    ])

    const plan = planResult.data as SaaSPlan | null
    const existing = existingResult.data as SaaSSubscription | null
    if (!plan) fail('Select a valid plan.')

    const now = new Date()
    const periodStart = existing?.current_period_start || now.toISOString().slice(0, 10)
    const periodEnd = existing?.current_period_end || (() => {
        const target = new Date(now)
        target.setMonth(target.getMonth() + (billingCycle === 'yearly' ? 12 : 1))
        return target.toISOString().slice(0, 10)
    })()

    if (existing) {
        const { error } = await admin
            .from('saas_subscriptions')
            .update({
                saas_plan_id: plan.id,
                status,
                billing_cycle: billingCycle,
                discount_pct: discountPct,
                current_period_start: periodStart,
                current_period_end: periodEnd,
            } as never)
            .eq('id', existing.id)
        if (error) fail(error.message)
    } else {
        const { error } = await admin
            .from('saas_subscriptions')
            .insert({
                gym_id: gymId,
                saas_plan_id: plan.id,
                status,
                billing_cycle: billingCycle,
                discount_pct: discountPct,
                current_period_start: periodStart,
                current_period_end: periodEnd,
            } as never)
        if (error) fail(error.message)
    }

    await admin.from('gyms').update({ saas_plan_id: plan.id } as never).eq('id', gymId)

    await logPlatformAuditEvent({
        action: 'gym.subscription.updated',
        entityType: 'saas_subscription',
        entityId: existing?.id ?? null,
        gymId,
        newData: { planId, status, billingCycle, discountPct },
    })

    revalidatePath('/platform/billing')
    revalidatePath(`/platform/gyms/${gymId}`)
}

export async function createInvoice(formData: FormData): Promise<void> {
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const amount = Number(formData.get('amount_due') ?? 0)

    const subscriptionResult = await admin.from('saas_subscriptions').select('*').eq('gym_id', gymId).maybeSingle()
    const subscription = subscriptionResult.data as SaaSSubscription | null
    if (!subscription) fail('Subscription not found.')

    const invoiceNumber = `SAAS-${Date.now()}`
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const { error } = await admin.from('saas_invoices').insert({
        gym_id: gymId,
        subscription_id: subscription.id,
        invoice_number: invoiceNumber,
        amount,
        currency: 'INR',
        status: 'sent',
        due_date: dueDate.toISOString().slice(0, 10),
        period_start: subscription.current_period_start,
        period_end: subscription.current_period_end,
    } as never)

    if (error) fail(error.message)

    await logPlatformAuditEvent({
        action: 'invoice.created',
        entityType: 'saas_invoice',
        gymId,
        newData: { invoiceNumber, amount },
    })

    revalidatePath('/platform/billing')
    revalidatePath(`/platform/gyms/${gymId}`)
}

export async function resetGymAdminAccess(formData: FormData): Promise<void> {
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const adminMembershipsResult = await admin
        .from('admins')
        .select('user_id, role')
        .eq('gym_id', gymId)
        .in('role', ['owner', 'admin'])
        .order('created_at', { ascending: true })
        .limit(1)

    const targetMembership = adminMembershipsResult.data?.[0]
    if (!targetMembership) fail('No owner/admin account found for this gym.')

    const authUser = await admin.auth.admin.getUserById(targetMembership.user_id)
    const email = authUser.data.user?.email
    if (!email) fail('Target admin does not have an email account.')

    const linkResult = await admin.auth.admin.generateLink({ type: 'recovery', email })
    if (linkResult.error) fail(linkResult.error.message)

    await logPlatformAuditEvent({
        action: 'gym.admin_access.reset',
        entityType: 'gym_admin',
        gymId,
        newData: { email, actionLinkGenerated: true },
    })

    revalidatePath(`/platform/gyms/${gymId}`)
}

export async function createSupportTicket(formData: FormData): Promise<void> {
    const context = await requirePlatformContext()
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const subject = String(formData.get('subject') ?? '').trim()
    const message = String(formData.get('message') ?? '').trim()
    const priority = String(formData.get('priority') ?? 'medium')
    const category = String(formData.get('category') ?? 'general')

    if (!gymId || !subject || !message) fail('Gym, subject, and message are required.')

    const ticketResult = await admin
        .from('support_tickets')
        .insert({
            gym_id: gymId,
            assigned_to: context.platformAdmin.id,
            ticket_number: `TKT-${Date.now()}`,
            subject,
            category,
            priority,
            status: 'open',
        } as never)
        .select('*')
        .single()

    if (ticketResult.error) fail(ticketResult.error.message)

    const ticket = ticketResult.data as { id: string }
    const messageResult = await admin
        .from('support_ticket_messages')
        .insert({
            ticket_id: ticket.id,
            sender_type: 'platform_admin',
            sender_id: context.platformAdmin.id,
            body: message,
            is_internal_note: false,
        } as never)

    if (messageResult.error) fail(messageResult.error.message)

    await logPlatformAuditEvent({
        action: 'support.ticket.created',
        entityType: 'support_ticket',
        entityId: ticket.id,
        gymId,
        newData: { subject, priority, category },
    })

    revalidatePath('/platform/support')
    revalidatePath(`/platform/gyms/${gymId}`)
}

export async function addSupportReply(formData: FormData): Promise<void> {
    const context = await requirePlatformContext()
    const admin = adminClient()
    const ticketId = String(formData.get('ticket_id') ?? '')
    const gymId = String(formData.get('gym_id') ?? '')
    const message = String(formData.get('message') ?? '').trim()
    const status = String(formData.get('status') ?? 'in_progress')
    const isInternalNote = String(formData.get('is_internal_note') ?? 'false') === 'true'

    if (!message) fail('Reply message is required.')

    const insertResult = await admin.from('support_ticket_messages').insert({
        ticket_id: ticketId,
        sender_type: 'platform_admin',
        sender_id: context.platformAdmin.id,
        body: message,
        is_internal_note: isInternalNote,
    } as never)
    if (insertResult.error) fail(insertResult.error.message)

    await admin
        .from('support_tickets')
        .update({
            status,
            resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null,
        } as never)
        .eq('id', ticketId)

    await logPlatformAuditEvent({
        action: 'support.ticket.replied',
        entityType: 'support_ticket',
        entityId: ticketId,
        gymId,
        newData: { status, isInternalNote },
    })

    revalidatePath('/platform/support')
}

export async function publishAnnouncement(formData: FormData): Promise<void> {
    const context = await requirePlatformContext()
    const admin = adminClient()
    const title = String(formData.get('title') ?? '').trim()
    const body = String(formData.get('body') ?? '').trim()
    const type = String(formData.get('type') ?? 'info')
    const gymId = String(formData.get('gym_id') ?? '')
    const planId = String(formData.get('plan_id') ?? '')
    const expiresAt = String(formData.get('expires_at') ?? '').trim()

    if (!title || !body) fail('Title and body are required.')

    const announcementResult = await admin
        .from('platform_announcements')
        .insert({
            created_by: context.platformAdmin.id,
            title,
            body,
            type,
            target_gym_id: gymId || null,
            target_plan_id: planId || null,
            is_published: true,
            publish_at: new Date().toISOString(),
            expires_at: expiresAt || null,
        } as never)
        .select('*')
        .single()

    if (announcementResult.error) fail(announcementResult.error.message)

    await logPlatformAuditEvent({
        action: 'announcement.published',
        entityType: 'platform_announcement',
        entityId: announcementResult.data.id,
        gymId: gymId || null,
        newData: { type, planId: planId || null, expiresAt: expiresAt || null },
    })

    revalidatePath('/platform/announcements')
}

export async function setGymFeatureOverride(formData: FormData): Promise<void> {
    const context = await requirePlatformContext()
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const flagKey = String(formData.get('flag_key') ?? '').trim()
    const enabled = String(formData.get('is_enabled') ?? '') === 'true'
    const note = String(formData.get('note') ?? '').trim()

    if (!flagKey) fail('Feature key is required.')

    const existingResult = await admin
        .from('gym_feature_flags')
        .select('id')
        .eq('gym_id', gymId)
        .eq('flag_key', flagKey)
        .maybeSingle()

    const existing = existingResult.data as { id: string } | null
    if (existing) {
        const { error } = await admin
            .from('gym_feature_flags')
            .update({
                is_enabled: enabled,
                note: note || null,
                overridden_by: context.platformAdmin.id,
            } as never)
            .eq('id', existing.id)
        if (error) fail(error.message)
    } else {
        const { error } = await admin
            .from('gym_feature_flags')
            .insert({
                gym_id: gymId,
                flag_key: flagKey,
                is_enabled: enabled,
                note: note || null,
                overridden_by: context.platformAdmin.id,
            } as never)
        if (error) fail(error.message)
    }

    await logPlatformAuditEvent({
        action: 'feature_override.updated',
        entityType: 'gym_feature_flag',
        gymId,
        newData: { flagKey, enabled, note: note || null },
    })

    revalidatePath('/platform/feature-flags')
    revalidatePath(`/platform/gyms/${gymId}`)
}

export async function startImpersonation(formData: FormData): Promise<void> {
    const context = await requirePlatformContext()
    const admin = adminClient()
    const gymId = String(formData.get('gym_id') ?? '')
    const reason = String(formData.get('reason') ?? '').trim()
    if (!reason) fail('Reason is required before impersonation starts.')

    const gymAdminResult = await admin
        .from('admins')
        .select('user_id, role')
        .eq('gym_id', gymId)
        .in('role', ['owner', 'admin'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    const gymAdmin = gymAdminResult.data as { user_id: string } | null
    if (!gymAdmin) fail('No gym admin account is available to impersonate.')

    await admin
        .from('impersonation_sessions')
        .update({ ended_at: new Date().toISOString() } as never)
        .eq('platform_admin_id', context.platformAdmin.id)
        .is('ended_at', null)

    const tokenHash = createHash('sha256').update(`${context.user.id}:${gymId}:${Date.now()}:${randomUUID()}`).digest('hex')
    const sessionResult = await admin
        .from('impersonation_sessions')
        .insert({
            platform_admin_id: context.platformAdmin.id,
            gym_id: gymId,
            impersonated_user_id: gymAdmin.user_id,
            reason,
            token_hash: tokenHash,
        } as never)
        .select('*')
        .single()

    if (sessionResult.error) fail(sessionResult.error.message)

    await admin
        .from('profiles')
        .update(({ active_gym_id: gymId, role: 'owner' } satisfies UpdateTables<'profiles'>) as never)
        .eq('id', context.user.id)

    await logPlatformAuditEvent({
        action: 'impersonation.started',
        entityType: 'impersonation_session',
        entityId: sessionResult.data.id,
        gymId,
        newData: { reason, impersonatedUserId: gymAdmin.user_id },
    })

    revalidatePath('/platform')
    redirect('/admin/dashboard')
}

export async function stopImpersonation(): Promise<void> {
    const context = await requirePlatformContext()
    const admin = adminClient()

    await admin
        .from('impersonation_sessions')
        .update({ ended_at: new Date().toISOString() } as never)
        .eq('platform_admin_id', context.platformAdmin.id)
        .is('ended_at', null)

    await logPlatformAuditEvent({
        action: 'impersonation.stopped',
        entityType: 'impersonation_session',
        entityId: context.activeImpersonation?.id ?? null,
        gymId: context.activeImpersonation?.gym_id ?? null,
    })

    revalidatePath('/platform')
    redirect('/platform')
}

export async function createManualSystemEvent(): Promise<void> {
    fail(getMessage(null, 'Manual system events are no longer supported by the current platform schema.'))
}

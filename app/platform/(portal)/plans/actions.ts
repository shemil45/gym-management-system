'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { recordAudit, requireCapability } from '@/lib/platform/auth'
import {
    PLAN_ENTITLEMENT_COLUMNS,
    buildEntitlementSnapshot,
    type PlanEntitlementSource,
} from '@/lib/billing/plan-entitlements'
import type { ActionState } from '@/app/platform/actions'

/**
 * Plan catalogue writes.
 *
 * A plan is a price-list entry, not a contract. Editing one changes what the
 * tier costs to buy from now on; it never re-rates or re-entitles the tenants
 * already on it, because both their price and their entitlements were copied
 * onto their subscription when the plan was assigned. Pushing changes onto
 * existing tenants is `applyPlanToTenants` - a separate, audited act with a
 * confirmation in front of it.
 */

const PLAN_LIMIT_MAX = 1_000_000
const PLAN_PRICE_MAX = 10_000_000

/** Blank means unlimited. An explicit value must be a positive whole number. */
function parseLimit(raw: FormDataEntryValue | null, label: string): number | null {
    const value = String(raw ?? '').trim()
    if (value === '') return null

    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > PLAN_LIMIT_MAX) {
        throw new Error(`${label} must be a whole number of at least 1, or blank for unlimited.`)
    }
    return parsed
}

function parsePrice(raw: FormDataEntryValue | null, label: string): number {
    const parsed = Number(String(raw ?? '').trim() || '0')
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > PLAN_PRICE_MAX) {
        throw new Error(`${label} must be zero or more.`)
    }
    return Math.round(parsed * 100) / 100
}

function parseDays(raw: FormDataEntryValue | null, label: string, max: number): number {
    const parsed = Number(String(raw ?? '').trim() || '0')
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) {
        throw new Error(`${label} must be a whole number between 0 and ${max}.`)
    }
    return parsed
}

/** `Growth Plus` becomes `growth_plus`. Only used on create; the code is then fixed. */
function slugifyCode(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40)
}

type PlanFormValues = {
    name: string
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
    features: string[]
}

/**
 * Reads and validates a plan form.
 *
 * Feature keys are intersected with the catalogue rather than trusted, so a
 * hand-crafted request cannot write an entitlement key that nothing sells -
 * which is how an internal key like `feature_flags` ended up on a customer
 * plan in the first place.
 */
async function readPlanForm(formData: FormData): Promise<PlanFormValues> {
    const service = getSupabaseAdmin()

    const name = String(formData.get('name') ?? '').trim()
    if (name.length < 2 || name.length > 60) {
        throw new Error('Plan name must be between 2 and 60 characters.')
    }

    const catalogue = await service.from('platform_plan_features').select('key').eq('is_active', true)
    const known = new Set(((catalogue.data ?? []) as Array<{ key: string }>).map((row) => row.key))
    const features = formData
        .getAll('features')
        .map((entry) => String(entry))
        .filter((key) => known.has(key))

    return {
        name,
        description: String(formData.get('description') ?? '').trim() || null,
        price_monthly: parsePrice(formData.get('priceMonthly'), 'Monthly price'),
        price_annual: parsePrice(formData.get('priceAnnual'), 'Annual price'),
        trial_days: parseDays(formData.get('trialDays'), 'Trial duration', 365),
        grace_period_days: parseDays(formData.get('gracePeriodDays'), 'Grace period', 90),
        max_members: parseLimit(formData.get('maxMembers'), 'Member limit'),
        max_staff: parseLimit(formData.get('maxStaff'), 'Staff limit'),
        sort_order: parseDays(formData.get('sortOrder'), 'Tier order', 999),
        is_active: formData.get('isActive') === 'on',
        is_public: formData.get('isPublic') === 'on',
        features,
    }
}

function planError(message: string): ActionState {
    return { error: message, success: null }
}

export async function createPlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const session = await requireCapability('billing:write')
    const service = getSupabaseAdmin()

    let values: PlanFormValues
    try {
        values = await readPlanForm(formData)
    } catch (error) {
        return planError(error instanceof Error ? error.message : 'Check the plan details.')
    }

    const code = slugifyCode(values.name)
    if (!code) return planError('Plan name must contain at least one letter or number.')

    const clash = await service
        .from('platform_subscription_plans')
        .select('id, name, code')
        .or(`code.eq.${code},name.eq.${values.name}`)
        .maybeSingle()

    if (clash.data) return planError(`A plan named "${values.name}" already exists.`)

    const { data, error } = await service
        .from('platform_subscription_plans')
        .insert({ ...values, code } as never)
        .select('id')
        .single()

    if (error) return planError(error.message)

    await recordAudit({
        action: 'plan.create',
        entityType: 'subscription_plan',
        entityId: (data as { id: string }).id,
        metadata: { code, ...values, actor_role: session.admin.role },
    })

    revalidatePath('/platform/plans')
    revalidatePath('/platform/billing')

    return { error: null, success: `${values.name} created. It applies to new assignments only.` }
}

export async function updatePlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const session = await requireCapability('billing:write')
    const service = getSupabaseAdmin()

    const planId = String(formData.get('planId') ?? '')
    if (!planId) return planError('Pick a plan to edit.')

    let values: PlanFormValues
    try {
        values = await readPlanForm(formData)
    } catch (error) {
        return planError(error instanceof Error ? error.message : 'Check the plan details.')
    }

    const existing = await service
        .from('platform_subscription_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle()

    const before = existing.data as Record<string, unknown> | null
    if (!before) return planError('That plan no longer exists.')

    const nameClash = await service
        .from('platform_subscription_plans')
        .select('id')
        .eq('name', values.name)
        .neq('id', planId)
        .maybeSingle()

    if (nameClash.data) return planError(`Another plan is already named "${values.name}".`)

    // `code` is deliberately not editable: the signup default, seed SQL and any
    // external reference key off it, and renaming it would orphan them
    // silently. The display name is free to change.
    const { error } = await service
        .from('platform_subscription_plans')
        .update(values as never)
        .eq('id', planId)

    if (error) return planError(error.message)

    await recordAudit({
        action: 'plan.update',
        entityType: 'subscription_plan',
        entityId: planId,
        metadata: {
            code: before.code,
            before: {
                price_monthly: before.price_monthly,
                price_annual: before.price_annual,
                max_members: before.max_members,
                max_staff: before.max_staff,
                features: before.features,
                is_active: before.is_active,
            },
            after: values,
            actor_role: session.admin.role,
        },
    })

    revalidatePath('/platform/plans')
    revalidatePath('/platform/billing')

    return {
        error: null,
        success: `${values.name} saved. Tenants already on this plan keep the price and entitlements they were assigned.`,
    }
}

/** Retires or restores a plan. Retiring only hides it from new assignments. */
export async function setPlanActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
    await requireCapability('billing:write')
    const service = getSupabaseAdmin()

    const planId = String(formData.get('planId') ?? '')
    const active = String(formData.get('isActive') ?? '') === 'true'
    if (!planId) return planError('Pick a plan.')

    const { error } = await service
        .from('platform_subscription_plans')
        .update({ is_active: active } as never)
        .eq('id', planId)

    if (error) return planError(error.message)

    await recordAudit({
        action: active ? 'plan.activate' : 'plan.deactivate',
        entityType: 'subscription_plan',
        entityId: planId,
    })

    revalidatePath('/platform/plans')
    revalidatePath('/platform/billing')

    return {
        error: null,
        success: active
            ? 'Plan is available for new assignments again.'
            : 'Plan retired. Tenants already on it are unaffected and keep billing normally.',
    }
}

/**
 * Pushes a plan's current entitlements onto the tenants already on it.
 *
 * Entitlements only - prices are left exactly as they are. Re-rating a tenant
 * is a commercial decision that belongs on that tenant's own subscription, not
 * a side effect of a catalogue-wide button.
 */
export async function applyPlanToTenants(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const session = await requireCapability('billing:write')
    const service = getSupabaseAdmin()

    const planId = String(formData.get('planId') ?? '')
    if (!planId) return planError('Pick a plan.')

    const planResult = await service
        .from('platform_subscription_plans')
        .select(`name, ${PLAN_ENTITLEMENT_COLUMNS}`)
        .eq('id', planId)
        .maybeSingle()

    const plan = planResult.data as ({ name: string } & PlanEntitlementSource) | null
    if (!plan) return planError('That plan no longer exists.')

    const snapshot = buildEntitlementSnapshot(plan)

    const { data, error } = await service
        .from('gym_subscriptions')
        .update({
            plan_entitlements: snapshot,
            plan_entitlements_set_at: new Date().toISOString(),
        } as never)
        .eq('plan_id', planId)
        .select('gym_id')

    if (error) return planError(error.message)

    const updated = (data ?? []).length

    await recordAudit({
        action: 'plan.entitlements.apply',
        entityType: 'subscription_plan',
        entityId: planId,
        metadata: {
            plan: plan.name,
            subscriptionsUpdated: updated,
            entitlements: snapshot,
            actor_role: session.admin.role,
        },
    })

    revalidatePath('/platform/plans')
    revalidatePath('/platform/billing')
    revalidatePath('/platform/tenants')

    return {
        error: null,
        success:
            updated === 0
                ? 'No tenants are on this plan, so nothing changed.'
                : `${updated} ${updated === 1 ? 'tenant' : 'tenants'} moved onto the current ${plan.name} entitlements. Pricing was not touched.`,
    }
}

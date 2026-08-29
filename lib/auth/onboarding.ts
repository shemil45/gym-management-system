import 'server-only'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import type { InsertTables, UpdateTables } from '@/lib/types'
import { findAuthUserByEmail, getSupabaseAdmin } from '@/lib/supabase/admin'
import {
    PLAN_ENTITLEMENT_COLUMNS,
    buildEntitlementSnapshot,
    type PlanEntitlementSource,
} from '@/lib/billing/plan-entitlements'

type SupabaseAdminClient = SupabaseClient<Database>

export type RegisterGymOwnerInput = {
    name: string
    email: string
    password: string
    gymName: string
}

/**
 * Trial length used when no active plan defines one. Kept deliberately short:
 * a tenant that never gets a plan assigned should surface on the platform
 * dashboard's trial-expiry lane quickly rather than sitting free forever.
 */
const FALLBACK_TRIAL_DAYS = 14

type DefaultPlan = PlanEntitlementSource & {
    id: string
    price_monthly: number
    price_annual: number
    trial_days: number
}

/**
 * The plan a self-serve signup lands on: the cheapest active tier.
 *
 * Signup must not fail because no plans are configured, so a missing plan
 * degrades to a null plan_id and the fallback trial window.
 */
async function resolveDefaultPlan(admin: SupabaseAdminClient): Promise<DefaultPlan | null> {
    const result = await admin
        .from('platform_subscription_plans')
        .select(`id, price_monthly, price_annual, trial_days, ${PLAN_ENTITLEMENT_COLUMNS}`)
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })
        .limit(1)
        .maybeSingle()

    return (result.data as DefaultPlan | null) ?? null
}

export type RegisterGymOwnerResult =
    | {
        success: true
        userId: string
        gymId: string
    }
    | {
        error: string
    }

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

function slugify(value: string) {
    const normalized = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    return normalized || 'gym'
}

function withNumericSuffix(base: string, suffix: number) {
    const suffixValue = `-${suffix}`
    const truncatedBase = base.slice(0, Math.max(1, 48 - suffixValue.length))
    return `${truncatedBase}${suffixValue}`
}

async function resolveUniqueGymField(
    admin: SupabaseAdminClient,
    column: 'slug' | 'subdomain',
    baseValue: string,
) {
    let candidate = baseValue.slice(0, 48)
    let suffix = 2

    while (true) {
        const lookup = await admin
            .from('gyms')
            .select('id')
            .eq(column, candidate)
            .maybeSingle()

        if (lookup.error) {
            throw lookup.error
        }

        if (!lookup.data) {
            return candidate
        }

        candidate = withNumericSuffix(baseValue, suffix)
        suffix += 1
    }
}

export async function registerGymOwner(input: RegisterGymOwnerInput): Promise<RegisterGymOwnerResult> {
    const admin = getSupabaseAdmin()
    const email = input.email.trim().toLowerCase()
    const ownerName = input.name.trim()
    const gymName = input.gymName.trim()

    const existingAuthUser = await findAuthUserByEmail(email)
    if (existingAuthUser) {
        return { error: 'An account with this email already exists. Please sign in instead.' }
    }

    let createdUserId: string | null = null
    let createdProfile = false
    let createdGymId: string | null = null

    try {
        const createUserResult = await admin.auth.admin.createUser({
            email,
            password: input.password,
            email_confirm: true,
            user_metadata: {
                full_name: ownerName,
            },
        })

        if (createUserResult.error || !createUserResult.data.user) {
            return { error: getErrorMessage(createUserResult.error, 'Failed to create owner account.') }
        }

        const userId = createUserResult.data.user.id
        createdUserId = userId

        const gymBase = slugify(gymName)
        const slug = await resolveUniqueGymField(admin, 'slug', gymBase)

        const plan = await resolveDefaultPlan(admin)
        const trialDays = plan?.trial_days || FALLBACK_TRIAL_DAYS
        const trialEndsAt = new Date(Date.now() + trialDays * 86_400_000).toISOString()

        // Onboarding phase 1: take the minimum needed to open a workspace.
        // `subdomain` is deliberately left null - it is claimed later from the
        // setup checklist, and claiming it is one of the gates that completes
        // onboarding. Writing an auto-generated one here would silently
        // satisfy that gate with a value the owner never chose.
        const gymPayload: InsertTables<'gyms'> = {
            name: gymName,
            slug,
            subdomain: null,
            contact_email: email,
            platform_status: 'trialing',
            onboarding_status: 'pending',
            trial_ends_at: trialEndsAt,
        }

        const gymInsert = await admin
            .from('gyms')
            .insert(gymPayload as never)
            .select('id')
            .single()

        if (gymInsert.error || !gymInsert.data) {
            throw gymInsert.error ?? new Error('Gym record was not returned after creation.')
        }

        const gymId = gymInsert.data.id
        createdGymId = gymId

        const profilePayload: InsertTables<'profiles'> = {
            id: userId,
            role: 'owner',
            full_name: ownerName,
            phone: null,
            photo_url: null,
            active_gym_id: gymId,
            created_at: new Date().toISOString(),
        }

        const profileInsert = await admin
            .from('profiles')
            .insert(profilePayload as never)

        if (profileInsert.error) {
            throw profileInsert.error
        }

        createdProfile = true

        const membershipPayload: InsertTables<'admins'> = {
            user_id: userId,
            gym_id: gymId,
            role: 'owner',
        }

        const membershipInsert = await admin
            .from('admins')
            .insert(membershipPayload as never)

        if (membershipInsert.error) {
            throw membershipInsert.error
        }

        const profileUpdatePayload: UpdateTables<'profiles'> = {
            active_gym_id: gymId,
            role: 'owner',
        }

        const profileUpdate = await admin
            .from('profiles')
            .update(profileUpdatePayload as never)
            .eq('id', userId)

        if (profileUpdate.error) {
            throw profileUpdate.error
        }

        // Every tenant gets a billing record at signup, on trial. Without it
        // the gym exists but is invisible to the platform portal's billing and
        // MRR views, which is how the first five tenants ended up with no
        // subscription row at all.
        //
        // Prices are copied off the plan rather than referenced, so a later
        // price change does not silently re-rate tenants already signed up.
        const subscriptionInsert = await admin.from('gym_subscriptions').insert({
            gym_id: gymId,
            plan_id: plan?.id ?? null,
            status: 'trialing',
            billing_interval: 'monthly',
            monthly_price: plan?.price_monthly ?? 0,
            annual_price: plan?.price_annual ?? 0,
            // Signup is an assignment too, so the trial tenant's entitlements
            // are frozen the same way a paid assignment freezes them.
            plan_entitlements: plan ? buildEntitlementSnapshot(plan) : null,
            plan_entitlements_set_at: plan ? new Date().toISOString() : null,
            trial_ends_at: trialEndsAt,
            current_period_start: new Date().toISOString(),
            current_period_end: trialEndsAt,
            next_invoice_at: trialEndsAt,
        } as never)

        if (subscriptionInsert.error) {
            throw subscriptionInsert.error
        }

        revalidatePath('/admin/register')
        revalidatePath('/admin/login')

        return {
            success: true,
            userId,
            gymId,
        }
    } catch (error) {
        if (createdProfile && createdUserId) {
            await admin.from('profiles').delete().eq('id', createdUserId)
        }

        if (createdGymId) {
            await admin.from('gyms').delete().eq('id', createdGymId)
        }

        if (createdUserId) {
            await admin.auth.admin.deleteUser(createdUserId)
        }

        return {
            error: getErrorMessage(error, 'Failed to finish gym owner registration.'),
        }
    }
}

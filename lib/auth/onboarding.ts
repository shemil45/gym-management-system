import 'server-only'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import type { InsertTables, UpdateTables } from '@/lib/types'
import { findAuthUserByEmail, getSupabaseAdmin } from '@/lib/supabase/admin'

type SupabaseAdminClient = SupabaseClient<Database>

export type RegisterGymOwnerInput = {
    name: string
    email: string
    password: string
    gymName: string
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
        const subdomain = await resolveUniqueGymField(admin, 'subdomain', gymBase)

        const gymPayload: InsertTables<'gyms'> = {
            name: gymName,
            slug,
            subdomain,
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

        revalidatePath('/admin/register')
        revalidatePath('/login')
        revalidatePath('/select-gym')

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

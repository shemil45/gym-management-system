import 'server-only'

import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { QueryResult, Tables, UpdateTables } from '@/lib/types'
import type { ProfileRole } from '@/lib/auth/roles'
import { isStaffRole } from '@/lib/auth/roles'

type ViewerProfile = Pick<
    Tables<'profiles'>,
    'id' | 'role' | 'full_name' | 'phone' | 'photo_url' | 'active_gym_id'
>

type GymSummary = Pick<Tables<'gyms'>, 'id' | 'name' | 'subdomain'>

type AdminAccessRecord = Pick<Tables<'admins'>, 'id' | 'user_id' | 'gym_id' | 'role'> & {
    gym: GymSummary | null
}

type MemberAccessRecord = Pick<
    Tables<'members'>,
    | 'id'
    | 'user_id'
    | 'gym_id'
    | 'member_id'
    | 'membership_plan_id'
    | 'membership_expiry_date'
    | 'status'
    | 'referral_coins_balance'
> & {
    gym: GymSummary | null
}

export type GymAccessOption = {
    gym: GymSummary
    role: ProfileRole
    accessType: 'admin' | 'member'
}

export type CurrentGymContext = {
    user: User | null
    profile: ViewerProfile | null
    gym: GymSummary | null
    role: ProfileRole | null
    isStaff: boolean
    admin: AdminAccessRecord | null
    member: MemberAccessRecord | null
    accessibleGyms: GymAccessOption[]
    needsGymSelection: boolean
}

async function getViewerProfile(userId: string) {
    const supabase = await createClient()
    const profileResult = await supabase
        .from('profiles')
        .select('id, role, full_name, phone, photo_url, active_gym_id')
        .eq('id', userId)
        .maybeSingle()

    const { data: profile } = profileResult as unknown as QueryResult<ViewerProfile | null>
    return profile
}

async function getAccessibleGymsForUser(userId: string) {
    const admin = getSupabaseAdmin()

    const [adminResult, memberResult] = await Promise.all([
        admin
            .from('admins')
            .select('id, user_id, gym_id, role, gym:gyms(id, name, subdomain)')
            .eq('user_id', userId),
        admin
            .from('members')
            .select('id, user_id, gym_id, member_id, membership_plan_id, membership_expiry_date, status, referral_coins_balance, gym:gyms(id, name, subdomain)')
            .eq('user_id', userId),
    ])

    const { data: adminRows } = adminResult as unknown as QueryResult<AdminAccessRecord[] | null>
    const { data: memberRows } = memberResult as unknown as QueryResult<MemberAccessRecord[] | null>

    const accessMap = new Map<string, GymAccessOption>()

    for (const adminRow of adminRows ?? []) {
        if (!adminRow.gym) continue

        accessMap.set(adminRow.gym_id, {
            gym: adminRow.gym,
            role: adminRow.role,
            accessType: 'admin',
        })
    }

    for (const memberRow of memberRows ?? []) {
        if (!memberRow.gym || accessMap.has(memberRow.gym_id)) continue

        accessMap.set(memberRow.gym_id, {
            gym: memberRow.gym,
            role: 'member',
            accessType: 'member',
        })
    }

    const accessibleGyms = Array.from(accessMap.values()).sort((a, b) => a.gym.name.localeCompare(b.gym.name))

    return {
        accessibleGyms,
        admins: adminRows ?? [],
        members: memberRows ?? [],
    }
}

async function syncActiveGym(profileId: string, gymId: string, role: ProfileRole) {
    const supabase = await createClient()
    const payload: UpdateTables<'profiles'> = {
        active_gym_id: gymId,
        role,
    }

    await supabase
        .from('profiles')
        .update(payload as never)
        .eq('id', profileId)
}

export const getCurrentGymContext = cache(async (): Promise<CurrentGymContext> => {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return {
            user: null,
            profile: null,
            gym: null,
            role: null,
            isStaff: false,
            admin: null,
            member: null,
            accessibleGyms: [],
            needsGymSelection: false,
        }
    }

    const [profile, access] = await Promise.all([
        getViewerProfile(user.id),
        getAccessibleGymsForUser(user.id),
    ])

    const activeAccess =
        profile?.active_gym_id
            ? access.accessibleGyms.find(({ gym }) => gym.id === profile.active_gym_id) ?? null
            : null

    let resolvedAccess = activeAccess
    let resolvedProfile = profile

    if (!resolvedAccess && access.accessibleGyms.length === 1 && profile) {
        resolvedAccess = access.accessibleGyms[0]
        await syncActiveGym(profile.id, resolvedAccess.gym.id, resolvedAccess.role)
        resolvedProfile = {
            ...profile,
            active_gym_id: resolvedAccess.gym.id,
            role: resolvedAccess.role,
        }
    }

    if (!resolvedAccess) {
        return {
            user,
            profile: resolvedProfile,
            gym: null,
            role: resolvedProfile?.role ?? null,
            isStaff: false,
            admin: null,
            member: null,
            accessibleGyms: access.accessibleGyms,
            needsGymSelection: access.accessibleGyms.length > 1,
        }
    }

    if (resolvedProfile && (resolvedProfile.active_gym_id !== resolvedAccess.gym.id || resolvedProfile.role !== resolvedAccess.role)) {
        await syncActiveGym(resolvedProfile.id, resolvedAccess.gym.id, resolvedAccess.role)
        resolvedProfile = {
            ...resolvedProfile,
            active_gym_id: resolvedAccess.gym.id,
            role: resolvedAccess.role,
        }
    }

    const adminMembership = access.admins.find((entry) => entry.gym_id === resolvedAccess?.gym.id) ?? null
    const memberMembership = access.members.find((entry) => entry.gym_id === resolvedAccess?.gym.id) ?? null

    return {
        user,
        profile: resolvedProfile,
        gym: resolvedAccess.gym,
        role: resolvedAccess.role,
        isStaff: isStaffRole(resolvedAccess.role),
        admin: adminMembership,
        member: memberMembership,
        accessibleGyms: access.accessibleGyms,
        needsGymSelection: false,
    }
})

export const getAccessibleGyms = cache(async () => {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return {
            user: null,
            profile: null,
            accessibleGyms: [] as GymAccessOption[],
        }
    }

    const [profile, access] = await Promise.all([
        getViewerProfile(user.id),
        getAccessibleGymsForUser(user.id),
    ])

    return {
        user,
        profile,
        accessibleGyms: access.accessibleGyms,
    }
})

export async function setActiveGymForCurrentUser(gymId: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be signed in to choose a gym.' }
    }

    const { accessibleGyms } = await getAccessibleGymsForUser(user.id)
    const targetGym = accessibleGyms.find(({ gym }) => gym.id === gymId)

    if (!targetGym) {
        return { error: 'You do not have access to that gym.' }
    }

    const payload: UpdateTables<'profiles'> = {
        active_gym_id: targetGym.gym.id,
        role: targetGym.role,
    }

    const { error } = await supabase
        .from('profiles')
        .update(payload as never)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    return {
        success: true as const,
        gym: targetGym.gym,
        role: targetGym.role,
        isStaff: isStaffRole(targetGym.role),
    }
}

export type { AdminAccessRecord, GymSummary, MemberAccessRecord }

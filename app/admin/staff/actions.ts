'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isStaffRole, STAFF_ROLES, type ProfileRole, type StaffRole } from '@/lib/auth/roles'
import type { InsertTables, QueryResult } from '@/lib/types'

function getSupabaseAdmin() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

export async function createStaff(formData: FormData) {
    const supabase = await createClient()
    const admin = getSupabaseAdmin()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be signed in to add staff.' }
    }

    const profileResult = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    const { data: actorProfile } = profileResult as unknown as QueryResult<{ role: ProfileRole } | null>

    if (!actorProfile || !isStaffRole(actorProfile.role)) {
        return { error: 'You do not have permission to add staff.' }
    }

    const fullName = (formData.get('full_name') as string | null)?.trim()
    const phone = (formData.get('phone') as string | null)?.trim()
    const email = (formData.get('email') as string | null)?.trim().toLowerCase()
    const password = (formData.get('password') as string | null)?.trim()
    const role = formData.get('role') as StaffRole | null
    const photoFile = formData.get('photo') as File | null

    if (!fullName || !phone || !email || !password || !role) {
        return { error: 'Name, phone, email, role, and password are required.' }
    }

    if (!STAFF_ROLES.includes(role)) {
        return { error: 'Please choose a valid staff role.' }
    }

    let createdUserId: string | null = null
    let photoUrl: string | null = null

    try {
        const createUserResult = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (createUserResult.error || !createUserResult.data.user) {
            return { error: getErrorMessage(createUserResult.error, 'Failed to create auth user.') }
        }

        createdUserId = createUserResult.data.user.id

        if (photoFile && photoFile.size > 0) {
            const fileExt = photoFile.name.split('.').pop()
            const fileName = `staff-${createdUserId}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await admin.storage
                .from('avatars')
                .upload(fileName, photoFile, { upsert: true })

            if (uploadError) {
                await admin.auth.admin.deleteUser(createdUserId)
                return { error: getErrorMessage(uploadError, 'Failed to upload staff photo.') }
            }

            const { data: { publicUrl } } = admin.storage
                .from('avatars')
                .getPublicUrl(fileName)

            photoUrl = publicUrl
        }

        const profilePayload: InsertTables<'profiles'> = {
            id: createdUserId,
            full_name: fullName,
            phone,
            photo_url: photoUrl,
            role,
            created_at: new Date().toISOString(),
        }

        const { error: insertError } = await admin
            .from('profiles')
            .insert(profilePayload as never)

        if (insertError) {
            await admin.auth.admin.deleteUser(createdUserId)
            return { error: getErrorMessage(insertError, 'Failed to create staff profile.') }
        }

        revalidatePath('/admin/staff')
        return { success: true }
    } catch (error) {
        if (createdUserId) {
            await admin.auth.admin.deleteUser(createdUserId)
        }

        return { error: getErrorMessage(error, 'Failed to create staff member.') }
    }
}

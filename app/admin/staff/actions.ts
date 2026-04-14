'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin, findAuthUserByEmail } from '@/lib/supabase/admin'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { STAFF_ROLES, type StaffRole } from '@/lib/auth/roles'
import type { InsertTables, QueryResult, UpdateTables } from '@/lib/types'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, UPLOAD_FAILURE_MESSAGE } from '@/lib/constants/uploads'
import { getAvatarStoragePath } from '@/lib/utils/storage'

type ExistingProfile = {
    id: string
    active_gym_id: string | null
}

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

export async function createStaff(formData: FormData) {
    const viewer = await getCurrentGymContext()
    const admin = getSupabaseAdmin()

    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to add staff.' }
    }

    const fullName = (formData.get('full_name') as string | null)?.trim()
    const phone = (formData.get('phone') as string | null)?.trim()
    const email = (formData.get('email') as string | null)?.trim().toLowerCase()
    const password = (formData.get('password') as string | null)?.trim()
    const role = formData.get('role') as StaffRole | null
    const uploadedPhotoUrl = (formData.get('photo_url') as string | null)?.trim() || null
    const uploadedPhotoPath = (formData.get('photo_path') as string | null)?.trim() || null
    const photoFile = formData.get('photo') as File | null

    if (!fullName || !phone || !email || !password || !role) {
        return { error: 'Name, phone, email, role, and password are required.' }
    }

    if (!STAFF_ROLES.includes(role)) {
        return { error: 'Please choose a valid staff role.' }
    }

    let createdNewAuthUser = false
    let createdUserId: string | null = null
    let createdProfile = false
    let photoUrl: string | null = uploadedPhotoUrl
    let finalUploadedPhotoPath: string | null = uploadedPhotoPath

    try {
        const existingAuthUser = await findAuthUserByEmail(email)

        if (existingAuthUser) {
            createdUserId = existingAuthUser.id
        } else {
            const createUserResult = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            })

            if (createUserResult.error || !createUserResult.data.user) {
                return { error: getErrorMessage(createUserResult.error, 'Failed to create auth user.') }
            }

            createdNewAuthUser = true
            createdUserId = createUserResult.data.user.id
        }

        if (!createdUserId) {
            return { error: 'Unable to resolve the staff account.' }
        }

        if (!photoUrl && photoFile && photoFile.size > 0) {
            if (photoFile.size > MAX_UPLOAD_SIZE_BYTES) {
                if (createdNewAuthUser) {
                    await admin.auth.admin.deleteUser(createdUserId)
                }
                return { error: `Photo must be under ${MAX_UPLOAD_SIZE_LABEL}.` }
            }

            const fileExt = photoFile.name.split('.').pop()
            const fileName = `staff-${createdUserId}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await admin.storage
                .from('avatars')
                .upload(fileName, photoFile, { upsert: true })

            if (uploadError) {
                if (createdNewAuthUser) {
                    await admin.auth.admin.deleteUser(createdUserId)
                }
                return { error: getErrorMessage(uploadError, UPLOAD_FAILURE_MESSAGE) }
            }

            const { data: { publicUrl } } = admin.storage
                .from('avatars')
                .getPublicUrl(fileName)

            finalUploadedPhotoPath = fileName
            photoUrl = publicUrl
        }

        const existingProfileResult = await admin
            .from('profiles')
            .select('id, active_gym_id')
            .eq('id', createdUserId)
            .maybeSingle()
        const { data: existingProfile } = existingProfileResult as unknown as QueryResult<ExistingProfile | null>

        if (existingProfile) {
            const updatePayload: UpdateTables<'profiles'> = {
                full_name: fullName,
                phone,
                photo_url: photoUrl,
            }

            if (!existingProfile.active_gym_id || existingProfile.active_gym_id === viewer.gym.id) {
                updatePayload.active_gym_id = viewer.gym.id
                updatePayload.role = role
            }

            const { error: profileError } = await admin
                .from('profiles')
                .update(updatePayload as never)
                .eq('id', createdUserId)

            if (profileError) {
                throw profileError
            }
        } else {
            const profilePayload: InsertTables<'profiles'> = {
                id: createdUserId,
                full_name: fullName,
                phone,
                photo_url: photoUrl,
                role,
                active_gym_id: viewer.gym.id,
                created_at: new Date().toISOString(),
            }

            const { error: profileError } = await admin
                .from('profiles')
                .insert(profilePayload as never)

            if (profileError) {
                throw profileError
            }

            createdProfile = true
        }

        const { error: membershipError } = await admin
            .from('admins')
            .upsert(({
                user_id: createdUserId,
                gym_id: viewer.gym.id,
                role,
            } satisfies InsertTables<'admins'>) as never, {
                onConflict: 'user_id,gym_id',
            })

        if (membershipError) {
            throw membershipError
        }

        revalidatePath('/admin/staff')
        revalidatePath('/select-gym')
        return { success: true }
    } catch (error) {
        if (finalUploadedPhotoPath) {
            await admin.storage.from('avatars').remove([finalUploadedPhotoPath])
        }
        if (createdProfile && createdUserId) {
            await admin.from('profiles').delete().eq('id', createdUserId)
        }
        if (createdNewAuthUser && createdUserId) {
            await admin.auth.admin.deleteUser(createdUserId)
        }

        return { error: getErrorMessage(error, 'Failed to create staff member.') }
    }
}

export async function updateStaff(formData: FormData) {
    const viewer = await getCurrentGymContext()
    const admin = getSupabaseAdmin()
    const supabase = await createClient()

    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to edit staff.' }
    }

    const id = (formData.get('id') as string | null)?.trim()
    const fullName = (formData.get('full_name') as string | null)?.trim()
    const phone = (formData.get('phone') as string | null)?.trim()
    const role = formData.get('role') as StaffRole | null
    const existingPhotoUrl = (formData.get('existing_photo_url') as string | null)?.trim() || null
    const uploadedPhotoUrl = (formData.get('photo_url') as string | null)?.trim() || null
    const uploadedPhotoPath = (formData.get('photo_path') as string | null)?.trim() || null
    const photoFile = formData.get('photo') as File | null

    if (!id || !fullName || !phone || !role) {
        return { error: 'Name, phone, and role are required.' }
    }

    if (!STAFF_ROLES.includes(role)) {
        return { error: 'Please choose a valid staff role.' }
    }

    try {
        const existingProfileResult = await admin
            .from('profiles')
            .select('id, active_gym_id')
            .eq('id', id)
            .maybeSingle()
        const { data: existingProfile } = existingProfileResult as unknown as QueryResult<ExistingProfile | null>

        if (!existingProfile) {
            return { error: 'Staff profile not found.' }
        }

        let photoUrl = uploadedPhotoUrl || existingPhotoUrl
        let finalUploadedPhotoPath: string | null = uploadedPhotoPath

        if (!uploadedPhotoUrl && photoFile && photoFile.size > 0) {
            if (photoFile.size > MAX_UPLOAD_SIZE_BYTES) {
                return { error: `Photo must be under ${MAX_UPLOAD_SIZE_LABEL}.` }
            }

            const fileExt = photoFile.name.split('.').pop()
            const fileName = `staff-${id}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await admin.storage
                .from('avatars')
                .upload(fileName, photoFile, { upsert: true })

            if (uploadError) {
                return { error: getErrorMessage(uploadError, UPLOAD_FAILURE_MESSAGE) }
            }

            const { data: { publicUrl } } = admin.storage
                .from('avatars')
                .getPublicUrl(fileName)

            finalUploadedPhotoPath = fileName
            photoUrl = publicUrl
        }

        const updatePayload: UpdateTables<'profiles'> = {
            full_name: fullName,
            phone,
            photo_url: photoUrl,
        }

        if (!existingProfile.active_gym_id || existingProfile.active_gym_id === viewer.gym.id) {
            updatePayload.active_gym_id = viewer.gym.id
            updatePayload.role = role
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update(updatePayload as never)
            .eq('id', id)

        if (profileError) {
            if (finalUploadedPhotoPath) {
                await admin.storage.from('avatars').remove([finalUploadedPhotoPath])
            }
            return { error: getErrorMessage(profileError, 'Failed to update staff.') }
        }

        const { error: membershipError } = await admin
            .from('admins')
            .upsert(({
                user_id: id,
                gym_id: viewer.gym.id,
                role,
            } satisfies InsertTables<'admins'>) as never, {
                onConflict: 'user_id,gym_id',
            })

        if (membershipError) {
            if (finalUploadedPhotoPath) {
                await admin.storage.from('avatars').remove([finalUploadedPhotoPath])
            }
            return { error: getErrorMessage(membershipError, 'Failed to update staff gym role.') }
        }

        const oldPhotoPath = finalUploadedPhotoPath ? getAvatarStoragePath(existingPhotoUrl) : null
        if (finalUploadedPhotoPath && oldPhotoPath && oldPhotoPath !== finalUploadedPhotoPath) {
            await admin.storage.from('avatars').remove([oldPhotoPath])
        }

        revalidatePath('/admin/staff')
        revalidatePath(`/admin/staff/${id}`)
        revalidatePath(`/admin/staff/${id}/edit`)
        revalidatePath('/select-gym')
        return { success: true }
    } catch (error) {
        return { error: getErrorMessage(error, 'Failed to update staff.') }
    }
}

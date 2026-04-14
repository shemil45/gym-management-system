'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { InsertTables, QueryResult, UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, UPLOAD_FAILURE_MESSAGE } from '@/lib/constants/uploads'
import { getAvatarStoragePath } from '@/lib/utils/storage'
import { sendMemberWhatsAppNotification } from '@/lib/notifications/service'
import { isStaffRole, type ProfileRole } from '@/lib/auth/roles'

type MemberIdRow = Pick<InsertTables<'members'>, 'member_id'>
type PlanLookup = Pick<InsertTables<'membership_plans'>, 'duration_days' | 'price'>
type ReferrerLookup = { id: string }
type CreatedMember = { id: string }

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

function formatDateOfBirthPassword(dateOfBirth: string) {
    const [year, month, day] = dateOfBirth.split('-')

    if (!year || !month || !day) {
        return null
    }

    return `${day}${month}${year}`
}

export async function generateNextMemberId(): Promise<string> {
    const supabase = await createClient()

    // Only look at properly formatted GYM### IDs to avoid picking up numbers from mock/legacy data
    const membersResult = await supabase
        .from('members')
        .select('member_id')
        .like('member_id', 'GYM%')
        .order('member_id', { ascending: false })

    const { data: members } = membersResult as unknown as QueryResult<MemberIdRow[] | null>

    if (!members || members.length === 0) {
        return 'GYM001'
    }

    // Extract numbers only from GYM-prefixed IDs
    let maxNumber = 0
    for (const member of members) {
        const match = member.member_id.match(/^GYM(\d+)$/)
        if (match) {
            const num = parseInt(match[1])
            if (num > maxNumber) {
                maxNumber = num
            }
        }
    }

    const nextNumber = maxNumber + 1
    return `GYM${nextNumber.toString().padStart(3, '0')}`
}

export async function createMember(formData: FormData) {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()
    let createdUserId: string | null = null
    let createdMemberId: string | null = null
    const uploadedPhotoPath = (formData.get('photo_path') as string | null)?.trim() || null

    try {
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { error: 'You must be signed in to add members.' }
        }

        const profileResult = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        const { data: actorProfile } = profileResult as unknown as QueryResult<{ role: ProfileRole } | null>

        if (!actorProfile || !isStaffRole(actorProfile.role)) {
            return { error: 'You do not have permission to add members.' }
        }

        // Generate member ID
        const memberId = await generateNextMemberId()

        const fullName = (formData.get('full_name') as string | null)?.trim()
        const email = (formData.get('email') as string | null)?.trim().toLowerCase()
        const phone = (formData.get('phone') as string | null)?.trim()
        const dateOfBirth = (formData.get('date_of_birth') as string | null)?.trim()
        const planId = (formData.get('membership_plan_id') as string | null)?.trim()
        const paymentAmountValue = (formData.get('payment_amount') as string | null)?.trim()
        const paymentMethod = (formData.get('payment_method') as string | null)?.trim() as InsertTables<'payments'>['payment_method'] | null

        if (!fullName || !email || !phone || !dateOfBirth || !planId || !paymentAmountValue || !paymentMethod) {
            return { error: 'Name, email, phone, date of birth, plan, and payment details are required.' }
        }

        const generatedPassword = formatDateOfBirthPassword(dateOfBirth)
        if (!generatedPassword) {
            return { error: 'Date of birth must be valid to generate the member password.' }
        }

        // Get plan details
        const planResult = await supabase
            .from('membership_plans')
            .select('duration_days, price')
            .eq('id', planId)
            .single()

        const { data: plan } = planResult as unknown as QueryResult<PlanLookup | null>

        if (!plan) {
            return { error: 'Invalid membership plan' }
        }

        // Start date is set automatically to the creation date.
        const startDate = new Date()
        const expiryDate = new Date(startDate)
        expiryDate.setDate(expiryDate.getDate() + plan.duration_days)

        // Resolve referral code → referrer member
        const rawCode = (formData.get('referral_code') as string | null)?.trim().toUpperCase()
        let referrerId: string | null = null
        if (rawCode) {
            const referrerResult = await supabase
                .from('members')
                .select('id')
                .eq('member_id', rawCode)
                .single()
            const { data: referrer } = referrerResult as unknown as QueryResult<ReferrerLookup | null>
            if (!referrer) {
                return { error: `Referral code "${rawCode}" is not valid. Please check the member ID.` }
            }
            referrerId = referrer.id
        }

        // Create member
        const photoUrl = (formData.get('photo_url') as string | null)?.trim() || null

        const createUserResult = await supabaseAdmin.auth.admin.createUser({
            email,
            password: generatedPassword,
            email_confirm: true,
        })

        if (createUserResult.error || !createUserResult.data.user) {
            if (uploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
            }
            return { error: getErrorMessage(createUserResult.error, 'Failed to create member login.') }
        }

        createdUserId = createUserResult.data.user.id

        const profilePayload: InsertTables<'profiles'> = {
            id: createdUserId,
            role: 'member',
            full_name: fullName,
            phone,
            photo_url: photoUrl,
            created_at: new Date().toISOString(),
        }

        const { error: profileInsertError } = await supabaseAdmin
            .from('profiles')
            .insert(profilePayload as never)

        if (profileInsertError) {
            if (uploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
            }
            await supabaseAdmin.auth.admin.deleteUser(createdUserId)
            return { error: getErrorMessage(profileInsertError, 'Failed to create member profile.') }
        }

        const memberPayload: InsertTables<'members'> = {
            user_id: createdUserId,
            member_id: memberId,
            full_name: fullName,
            email,
            phone,
            date_of_birth: dateOfBirth,
            gender: ((formData.get('gender') as string) || null) as InsertTables<'members'>['gender'],
            address: (formData.get('address') as string) || null,
            emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
            emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
            membership_plan_id: planId,
            membership_start_date: startDate.toISOString().split('T')[0],
            membership_expiry_date: expiryDate.toISOString().split('T')[0],
            status: 'active',
            referred_by: referrerId,
            photo_url: photoUrl,
        }

        const memberInsertResult = await supabase
            .from('members')
            .insert(memberPayload as never)
            .select()
            .single()

        const { data: member, error: memberError } = memberInsertResult as unknown as QueryResult<CreatedMember | null>

        if (memberError) {
            if (uploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
            }
            if (createdUserId) {
                await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
                await supabaseAdmin.auth.admin.deleteUser(createdUserId)
            }
            return { error: getErrorMessage(memberError, 'Failed to create member') }
        }
        if (!member) {
            if (uploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
            }
            if (createdUserId) {
                await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
                await supabaseAdmin.auth.admin.deleteUser(createdUserId)
            }
            return { error: 'Member record was not returned after creation' }
        }

        createdMemberId = member.id

        // Create initial payment record
        const paymentPayload: InsertTables<'payments'> = {
            member_id: member.id,
            amount: Number(paymentAmountValue),
            payment_method: paymentMethod,
            payment_date: new Date().toISOString().split('T')[0],
            notes: 'Initial membership fee',
        }

        const { error: paymentError } = await supabase
            .from('payments')
            .insert(paymentPayload as never)

        if (paymentError) {
            await supabase.from('members').delete().eq('id', member.id)
            if (createdUserId) {
                await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
                await supabaseAdmin.auth.admin.deleteUser(createdUserId)
            }
            if (uploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
            }
            return { error: getErrorMessage(paymentError, 'Failed to create initial payment record') }
        }

        // If referred, create a referral record
        if (referrerId) {
            const referralPayload: InsertTables<'referrals'> = {
                referrer_id: referrerId,
                referred_id: member.id,
                referral_code: rawCode,
                status: 'pending',
            }

            await supabase.from('referrals').insert(referralPayload as never)
        }

        let notificationWarning: string | undefined

        const welcomeNotificationResult = await sendMemberWhatsAppNotification({
            memberId: member.id,
            notificationType: 'welcome_new_member',
            source: 'api',
        })

        if (!welcomeNotificationResult.success) {
            notificationWarning = `Member created, but welcome WhatsApp could not be sent: ${welcomeNotificationResult.error}`
            console.warn('[members] Welcome WhatsApp was not sent after member creation', {
                memberId: member.id,
                error: welcomeNotificationResult.error,
            })
        }

        revalidatePath('/admin/members')
        return {
            success: true,
            memberId: member.id,
            ...(notificationWarning ? { notificationWarning } : {}),
        }
    } catch (err: unknown) {
        if (createdMemberId) {
            await supabase.from('members').delete().eq('id', createdMemberId)
        }
        if (createdUserId) {
            await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
            await supabaseAdmin.auth.admin.deleteUser(createdUserId)
        }
        if (uploadedPhotoPath) {
            await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
        }
        const message = err instanceof Error ? err.message : 'Failed to create member'
        return { error: message }
    }
}

export async function updateMember(formData: FormData) {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()

    try {
        const memberId = formData.get('id') as string
        const planId = (formData.get('membership_plan_id') as string) || null
        const startDateValue = (formData.get('membership_start_date') as string) || null

        if (!memberId) {
            return { error: 'Member ID is required' }
        }

        let membershipExpiryDate: string | null = null
        if (planId && startDateValue) {
            const planResult = await supabase
                .from('membership_plans')
                .select('duration_days')
                .eq('id', planId)
                .single()
            const { data: plan } = planResult as unknown as QueryResult<Pick<InsertTables<'membership_plans'>, 'duration_days'> | null>

            if (!plan) {
                return { error: 'Invalid membership plan' }
            }

            const startDate = new Date(startDateValue)
            const expiryDate = new Date(startDate)
            expiryDate.setDate(expiryDate.getDate() + plan.duration_days)
            membershipExpiryDate = expiryDate.toISOString().split('T')[0]
        }

        const existingPhotoUrl = (formData.get('existing_photo_url') as string) || null
        const uploadedPhotoUrl = (formData.get('photo_url') as string | null)?.trim() || null
        const uploadedPhotoPath = (formData.get('photo_path') as string | null)?.trim() || null
        let photoUrl = uploadedPhotoUrl || existingPhotoUrl
        let finalUploadedPhotoPath: string | null = uploadedPhotoPath
        const photoFile = formData.get('photo') as File | null
        if (!uploadedPhotoUrl && photoFile && photoFile.size > 0) {
            if (photoFile.size > MAX_UPLOAD_SIZE_BYTES) {
                return { error: `Photo must be under ${MAX_UPLOAD_SIZE_LABEL}.` }
            }

            const fileExt = photoFile.name.split('.').pop()
            const fileName = `member-${memberId}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabaseAdmin.storage
                .from('avatars')
                .upload(fileName, photoFile, { upsert: true })

            if (uploadError) {
                return { error: getErrorMessage(uploadError, UPLOAD_FAILURE_MESSAGE) }
            }

            finalUploadedPhotoPath = fileName

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('avatars')
                .getPublicUrl(fileName)

            photoUrl = publicUrl
        }

        const updatePayload: UpdateTables<'members'> = {
            full_name: formData.get('full_name') as string,
            email: (formData.get('email') as string) || null,
            phone: formData.get('phone') as string,
            date_of_birth: (formData.get('date_of_birth') as string) || null,
            gender: ((formData.get('gender') as string) || null) as UpdateTables<'members'>['gender'],
            address: (formData.get('address') as string) || null,
            emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
            emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
            membership_plan_id: planId,
            membership_start_date: startDateValue,
            membership_expiry_date: membershipExpiryDate,
            photo_url: photoUrl,
        }

        const { error } = await supabase
            .from('members')
            .update(updatePayload as never)
            .eq('id', memberId)

        if (error) {
            if (finalUploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([finalUploadedPhotoPath])
            }
            return { error: getErrorMessage(error, 'Failed to update member') }
        }

        const oldPhotoPath = finalUploadedPhotoPath ? getAvatarStoragePath(existingPhotoUrl) : null
        if (finalUploadedPhotoPath && oldPhotoPath && oldPhotoPath !== finalUploadedPhotoPath) {
            await supabaseAdmin.storage.from('avatars').remove([oldPhotoPath])
        }

        revalidatePath('/admin/members')
        revalidatePath(`/admin/members/${memberId}`)
        revalidatePath(`/admin/members/${memberId}/edit`)
        return { success: true }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update member'
        return { error: message }
    }
}

export async function deleteMember(memberId: string) {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()

    try {
        if (!memberId) {
            return { error: 'Member ID is required' }
        }

        const memberResult = await supabase
            .from('members')
            .select('id, photo_url')
            .eq('id', memberId)
            .single()

        const { data: member, error: fetchError } = memberResult as unknown as QueryResult<Pick<InsertTables<'members'>, 'id' | 'photo_url'> | null>

        if (fetchError || !member) {
            return { error: getErrorMessage(fetchError, 'Member not found') }
        }

        const photoPath = getAvatarStoragePath(member.photo_url)

        const { error: deleteError } = await supabase
            .from('members')
            .delete()
            .eq('id', memberId)

        if (deleteError) {
            return { error: getErrorMessage(deleteError, 'Failed to delete member') }
        }

        if (photoPath) {
            await supabaseAdmin.storage.from('avatars').remove([photoPath])
        }

        revalidatePath('/admin/members')
        revalidatePath(`/admin/members/${memberId}`)
        revalidatePath(`/admin/members/${memberId}/edit`)
        return { success: true }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete member'
        return { error: message }
    }
}

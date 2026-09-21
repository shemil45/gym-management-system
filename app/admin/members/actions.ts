'use server'

import { createClient } from '@/lib/supabase/server'
import { todayInKolkata } from '@/lib/reports/dates'
import type { InsertTables, QueryResult, Tables, UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, UPLOAD_FAILURE_MESSAGE } from '@/lib/constants/uploads'
import { getAvatarStoragePath } from '@/lib/utils/storage'
import { sendMemberWhatsAppNotification } from '@/lib/notifications/service'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { findAuthUserByEmail, getSupabaseAdmin } from '@/lib/supabase/admin'
import { invalidateGymAdminSummaries } from '@/lib/auth/admin-server'
import { canAddMember } from '@/lib/billing/entitlements'
import { assertActiveSubscription } from '@/lib/billing/gate'
import { gymHasFeature } from '@/lib/gym/features'
import { creditReferrers } from '@/lib/payments/settle-member-payment'
import { checkLeadConvertible, convertReferralLead, creditReferrerBonus, findActiveLeadForRegistration } from '@/lib/referrals/server'
import {
    checkMutationAllowed,
    getActiveImpersonation,
    recordImpersonationWrite,
    releaseImpersonationWrite,
    IMPERSONATION_EMAIL_IN_USE_MESSAGE,
} from '@/lib/platform/impersonation-ledger'

type PlanLookup = Pick<InsertTables<'membership_plans'>, 'duration_days' | 'price'>
type ReferrerLookup = { id: string }
type CreatedMember = { id: string }
type ExistingProfile = { id: string; active_gym_id: string | null }
type ExistingMember = { id: string; user_id: string | null }

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

export async function createMember(formData: FormData) {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()
    const viewer = await getCurrentGymContext()
    let createdNewAuthUser = false
    let createdUserId: string | null = null
    let createdMemberId: string | null = null
    let createdProfile = false
    const uploadedPhotoPath = (formData.get('photo_path') as string | null)?.trim() || null

    try {
        if (!viewer.user || !viewer.isStaff || !viewer.gym) {
            return { error: 'You do not have permission to add members.' }
        }

        // Plan entitlement is checked before any work is done, so a tenant over
        // their limit fails fast instead of part-way through creating an auth
        // user and a member row.
        const entitlement = await canAddMember(viewer.gym.id)
        if (!entitlement.ok) {
            return { error: entitlement.reason }
        }

        const impersonation = await getActiveImpersonation(viewer.gym.id)
        const ledger = impersonation
            ? (type: Parameters<typeof recordImpersonationWrite>[2], id: string) =>
                  recordImpersonationWrite(impersonation.sessionId, viewer.gym!.id, type, id)
            : null

        const fullName = (formData.get('full_name') as string | null)?.trim()
        const email = (formData.get('email') as string | null)?.trim().toLowerCase()
        const phone = (formData.get('phone') as string | null)?.trim()
        const dateOfBirth = (formData.get('date_of_birth') as string | null)?.trim()
        const planId = (formData.get('membership_plan_id') as string | null)?.trim()
        const paymentAmountValue = (formData.get('payment_amount') as string | null)?.trim()
        const paymentMethod = (formData.get('payment_method') as string | null)?.trim() as InsertTables<'payments'>['payment_method'] | null
        const admissionFeeValue = (formData.get('admission_fee') as string | null)?.trim()
        const admissionFee = admissionFeeValue && Number.isFinite(Number(admissionFeeValue)) && Number(admissionFeeValue) >= 0
            ? Number(admissionFeeValue)
            : 0
        const requestedStartDate = (formData.get('membership_start_date') as string | null)?.trim() || null

        if (!fullName || !email || !phone || !dateOfBirth || !planId || !paymentAmountValue || !paymentMethod) {
            return { error: 'Name, email, phone, date of birth, plan, and payment details are required.' }
        }

        const generatedPassword = formatDateOfBirthPassword(dateOfBirth)
        if (!generatedPassword) {
            return { error: 'Date of birth must be valid to generate the member password.' }
        }

        const duplicateMemberResult = await supabaseAdmin
            .from('members')
            .select('id, user_id')
            .eq('gym_id', viewer.gym.id)
            .eq('email', email)
            .maybeSingle()
        const { data: duplicateMember } = duplicateMemberResult as unknown as QueryResult<ExistingMember | null>

        if (duplicateMember) {
            return { error: 'A member with this email already exists in the selected gym.' }
        }

        const { data: memberId, error: memberIdError } = await supabase.rpc('generate_member_id', {
            p_gym_id: viewer.gym.id,
        } as never)

        if (memberIdError || !memberId) {
            return { error: getErrorMessage(memberIdError, 'Failed to generate member ID') }
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

        const gymSettingsResult = await supabase
            .from('gyms')
            .select('allow_custom_membership_start_date, allow_admission_fee_waiver, default_admission_fee')
            .eq('id', viewer.gym.id)
            .single()
        const { data: gymSettingsRow } = gymSettingsResult as unknown as QueryResult<Pick<Tables<'gyms'>, 'allow_custom_membership_start_date' | 'allow_admission_fee_waiver' | 'default_admission_fee'> | null>
        const allowCustomStartDate = gymSettingsRow?.allow_custom_membership_start_date ?? false
        const allowAdmissionFeeWaiver = gymSettingsRow?.allow_admission_fee_waiver ?? true
        const effectiveAdmissionFee = allowAdmissionFeeWaiver ? admissionFee : (gymSettingsRow?.default_admission_fee ?? 0)

        // Start date defaults to today unless the gym allows staff to override it.
        const startDate = allowCustomStartDate && requestedStartDate ? new Date(requestedStartDate) : new Date(todayInKolkata())
        if (Number.isNaN(startDate.getTime())) {
            return { error: 'Membership start date is invalid.' }
        }
        const expiryDate = new Date(startDate)
        expiryDate.setDate(expiryDate.getDate() + plan.duration_days)

        // Resolve referral code → referrer member
        // Referral codes credit a real member's coin balance, which cannot be
        // undone when a demo session ends - so operators do not get them.
        // The form hides the field when the gym's `referrals` feature is off;
        // the action ignores it too so a stale form cannot slip a code through.
        const referralsEnabled = impersonation ? false : await gymHasFeature(viewer.gym.id, 'referrals')
        const rawCode = referralsEnabled
            ? (formData.get('referral_code') as string | null)?.trim().toUpperCase()
            : undefined
        // A referral lead (someone who submitted the member's share link) is
        // converted by this registration. The id is re-validated against the
        // viewer's gym here and again, conditionally, at the moment of
        // conversion; nothing about the lead is trusted from the form.
        let leadId = referralsEnabled ? (formData.get('referral_lead_id') as string | null)?.trim() || null : null
        let referrerId: string | null = null
        let matchedLeadNote: string | undefined

        // Plain registration of someone who already submitted a referral
        // link: pick the open lead up by phone or email so it is converted
        // here instead of sitting pending until it expires. A referrer named
        // at the desk that disagrees with the lead is refused rather than
        // crediting two people for one join.
        if (referralsEnabled && !leadId) {
            const matched = await findActiveLeadForRegistration(viewer.gym.id, phone, email)
            if (matched) {
                if (rawCode) {
                    const pickedResult = await supabase.from('members').select('id, full_name').eq('member_id', rawCode).eq('gym_id', viewer.gym.id).maybeSingle()
                    const picked = (pickedResult as unknown as QueryResult<{ id: string; full_name: string } | null>).data
                    if (picked && picked.id !== matched.referrerId) {
                        return {
                            error: `${fullName} already has a pending referral from ${matched.referrerName}. Remove the "Referred by" selection to complete that referral, or cancel it under Referral leads first.`,
                        }
                    }
                }
                leadId = matched.id
                matchedLeadNote = `Matched the pending referral from ${matched.referrerName}; they will be credited.`
            }
        }

        if (leadId) {
            const lead = await checkLeadConvertible(viewer.gym.id, leadId)
            if (!lead.ok) {
                return {
                    error: lead.reason === 'expired'
                        ? 'This referral has expired and can no longer be completed. Register the member without the referral if they still want to join.'
                        : lead.reason === 'not-pending'
                            ? 'This referral has already been completed or cancelled.'
                            : 'This referral could not be found for your gym.',
                }
            }
            referrerId = lead.referrerId
        } else if (rawCode) {
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

        const existingAuthUser = await findAuthUserByEmail(email)

        if (impersonation && existingAuthUser) {
            return { error: IMPERSONATION_EMAIL_IN_USE_MESSAGE }
        }

        if (existingAuthUser) {
            createdUserId = existingAuthUser.id

            const updateUserResult = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
                password: generatedPassword,
                email_confirm: true,
            })

            if (updateUserResult.error) {
                if (uploadedPhotoPath) {
                    await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
                }
                return { error: getErrorMessage(updateUserResult.error, 'Failed to set member login credentials.') }
            }
        } else {
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

            createdNewAuthUser = true
            createdUserId = createUserResult.data.user.id
            if (ledger) await ledger('auth_user', createdUserId)
        }

        if (!createdUserId) {
            return { error: 'Unable to resolve the member login account.' }
        }

        const existingProfileResult = await supabaseAdmin
            .from('profiles')
            .select('id, active_gym_id')
            .eq('id', createdUserId)
            .maybeSingle()
        const { data: existingProfile } = existingProfileResult as unknown as QueryResult<ExistingProfile | null>

        if (existingProfile) {
            const profileUpdate: UpdateTables<'profiles'> = {
                full_name: fullName,
                phone,
                photo_url: photoUrl,
            }

            if (!existingProfile.active_gym_id || existingProfile.active_gym_id === viewer.gym.id) {
                profileUpdate.active_gym_id = viewer.gym.id
                profileUpdate.role = 'member'
            }

            const { error: profileUpdateError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdate as never)
                .eq('id', createdUserId)

            if (profileUpdateError) {
                throw profileUpdateError
            }
        } else {
            const profilePayload: InsertTables<'profiles'> = {
                id: createdUserId,
                role: 'member',
                full_name: fullName,
                phone,
                photo_url: photoUrl,
                active_gym_id: viewer.gym.id,
                created_at: new Date().toISOString(),
            }

            const { error: profileInsertError } = await supabaseAdmin
                .from('profiles')
                .insert(profilePayload as never)

            if (profileInsertError) {
                throw profileInsertError
            }

            createdProfile = true
            if (ledger) await ledger('profile', createdUserId)
        }

        const memberPayload: InsertTables<'members'> = {
            user_id: createdUserId,
            gym_id: viewer.gym.id,
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
            if (createdProfile && createdUserId) {
                await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
            }
            if (createdNewAuthUser && createdUserId) {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId)
            }
            return { error: getErrorMessage(memberError, 'Failed to create member') }
        }
        if (!member) {
            if (uploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
            }
            if (createdProfile && createdUserId) {
                await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
            }
            if (createdNewAuthUser && createdUserId) {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId)
            }
            return { error: 'Member record was not returned after creation' }
        }

        createdMemberId = member.id
        if (ledger) {
            await ledger('member', member.id)
            if (uploadedPhotoPath) await ledger('storage_object', uploadedPhotoPath)
        }

        // Create initial payment record
        const planAmount = Number(paymentAmountValue)
        const totalAmount = planAmount + effectiveAdmissionFee

        const paymentPayload: InsertTables<'payments'> = {
            gym_id: viewer.gym.id,
            member_id: member.id,
            amount: totalAmount,
            admission_fee_amount: effectiveAdmissionFee,
            payment_method: paymentMethod,
            payment_date: todayInKolkata(),
            notes: 'Initial membership fee',
            membership_plan_id: planId,
            processed_by: viewer.user.id,
        }

        const paymentInsertResult = await supabase
            .from('payments')
            .insert(paymentPayload as never)
            .select('id')
            .single()
        const { data: initialPayment, error: paymentError } = paymentInsertResult as unknown as QueryResult<{ id: string } | null>

        if (paymentError) {
            await supabase.from('members').delete().eq('id', member.id)
            if (createdProfile && createdUserId) {
                await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
            }
            if (createdNewAuthUser && createdUserId) {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId)
            }
            if (uploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
            }
            return { error: getErrorMessage(paymentError, 'Failed to create initial payment record') }
        }
        if (ledger && initialPayment) await ledger('payment', initialPayment.id)

        // If referred, convert the lead or create a referral record
        let referralWarning: string | undefined
        if (leadId && referrerId) {
            // One conditional update is the lock: it only succeeds for a
            // pending, unexpired lead of this gym, so a second staff member
            // or an expiry that landed mid-registration cannot double-credit.
            const converted = await convertReferralLead(viewer.gym.id, leadId, member.id)
            if (converted) {
                await creditReferrerBonus(viewer.gym.id, converted.referrerId)
            } else {
                referralWarning = 'Member created, but the referral was not converted: it expired or was completed elsewhere while you were registering.'
                console.warn('[members] Referral lead was not converted after member creation', {
                    memberId: member.id,
                    leadId,
                })
            }
        } else if (referrerId) {
            const referralPayload: InsertTables<'referrals'> = {
                gym_id: viewer.gym.id,
                referrer_id: referrerId,
                referred_id: member.id,
                referral_code: rawCode,
                status: 'pending',
                source: 'staff',
            }

            const { error: referralError } = await supabase.from('referrals').insert(referralPayload as never)
            if (referralError) {
                // The member and their payment are already committed; losing
                // the referral is worth a warning, not a rollback.
                referralWarning = `Member created, but the referral could not be recorded: ${referralError.message}`
                console.warn('[members] Referral was not recorded after member creation', {
                    memberId: member.id,
                    referrerId,
                    error: referralError.message,
                })
            } else {
                // The enrolment payment above is the referred member's first
                // paid event, so the referrer earns their bonus now rather than
                // waiting for a self-service renewal that may never happen.
                await creditReferrers(viewer.gym.id, member.id)
            }
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

        invalidateGymAdminSummaries(viewer.gym.id)
        revalidatePath('/admin/members')
        if (leadId) revalidatePath('/admin/members/referrals')
        return {
            success: true,
            memberId: member.id,
            ...(notificationWarning ? { notificationWarning } : {}),
            ...(referralWarning ? { referralWarning } : {}),
            ...(matchedLeadNote && !referralWarning ? { referralNote: matchedLeadNote } : {}),
        }
    } catch (err: unknown) {
        if (createdMemberId) {
            await supabase.from('members').delete().eq('id', createdMemberId)
        }
        if (createdProfile && createdUserId) {
            await supabaseAdmin.from('profiles').delete().eq('id', createdUserId)
        }
        if (createdNewAuthUser && createdUserId) {
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
    const viewer = await getCurrentGymContext()

    try {
        if (!viewer.user || !viewer.isStaff || !viewer.gym) {
            return { error: 'You do not have permission to edit members.' }
        }

        const lapsed = await assertActiveSubscription(viewer.gym.id)
        if (lapsed) return { error: lapsed.error }

        const memberId = formData.get('id') as string
        const planId = (formData.get('membership_plan_id') as string) || null
        const startDateValue = (formData.get('membership_start_date') as string) || null

        if (!memberId) {
            return { error: 'Member ID is required' }
        }

        const allowed = await checkMutationAllowed(viewer.gym.id, 'member', memberId)
        if (allowed.error) return { error: allowed.error }

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

        const updateResult = await supabase
            .from('members')
            .update(updatePayload as never)
            .eq('id', memberId)
            .select('gym_id')
            .single()
        const { data: updatedMember, error } = updateResult as unknown as QueryResult<{ gym_id: string } | null>

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

        if (updatedMember?.gym_id) {
            invalidateGymAdminSummaries(updatedMember.gym_id)
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
    const viewer = await getCurrentGymContext()

    try {
        if (!viewer.user || !viewer.isStaff || !viewer.gym) {
            return { error: 'You do not have permission to delete members.' }
        }

        const lapsed = await assertActiveSubscription(viewer.gym.id)
        if (lapsed) return { error: lapsed.error }

        if (!memberId) {
            return { error: 'Member ID is required' }
        }

        const allowed = await checkMutationAllowed(viewer.gym.id, 'member', memberId)
        if (allowed.error) return { error: allowed.error }

        const memberResult = await supabase
            .from('members')
            .select('id, photo_url, gym_id')
            .eq('id', memberId)
            .single()

        const { data: member, error: fetchError } = memberResult as unknown as QueryResult<Pick<InsertTables<'members'>, 'id' | 'photo_url' | 'gym_id'> | null>

        if (fetchError || !member) {
            return { error: getErrorMessage(fetchError, 'Member not found') }
        }

        const photoPath = getAvatarStoragePath(member.photo_url)

        const deleteResult = await supabase
            .from('members')
            .delete()
            .eq('id', memberId)
            .select('id')
        const { data: deletedRows, error: deleteError } = deleteResult as unknown as QueryResult<{ id: string }[] | null>

        if (deleteError) {
            return { error: getErrorMessage(deleteError, 'Failed to delete member') }
        }

        if (!deletedRows || deletedRows.length === 0) {
            return { error: 'Nothing was deleted.' }
        }

        if (photoPath) {
            await supabaseAdmin.storage.from('avatars').remove([photoPath])
        }

        if (member.gym_id) {
            invalidateGymAdminSummaries(member.gym_id)
        }
        if (allowed.owned) await releaseImpersonationWrite(viewer.gym.id, 'member', memberId)
        revalidatePath('/admin/members')
        revalidatePath(`/admin/members/${memberId}`)
        revalidatePath(`/admin/members/${memberId}/edit`)
        return { success: true }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete member'
        return { error: message }
    }
}

export type ReferrerMatch = {
    id: string
    memberId: string
    fullName: string
    photoUrl: string | null
}

/**
 * Members an operator can name as a referrer, matched on member ID or name.
 *
 * Read through the caller's client so RLS keeps it to their own gym. The form
 * only ever submits a code it got from here, so a typo cannot be enrolled.
 */
export async function searchReferrers(query: string): Promise<ReferrerMatch[]> {
    // Member IDs and names are letters, digits and spaces; dropping anything
    // else keeps PostgREST's `or` filter and LIKE wildcards out of reach.
    const term = query.replace(/[^\p{L}\p{N}\s-]/gu, '').trim()
    if (term.length < 2) return []

    const viewer = await getCurrentGymContext()
    if (!viewer.gym) return []

    const supabase = await createClient()
    const pattern = `%${term}%`
    const result = await supabase
        .from('members')
        .select('id, member_id, full_name, photo_url')
        .eq('gym_id', viewer.gym.id)
        .eq('status', 'active')
        .or(`member_id.ilike.${pattern},full_name.ilike.${pattern}`)
        .order('member_id')
        .limit(8)
    const { data } = result as unknown as QueryResult<
        Array<{ id: string; member_id: string; full_name: string; photo_url: string | null }> | null
    >

    return (data ?? []).map((row) => ({
        id: row.id,
        memberId: row.member_id,
        fullName: row.full_name,
        photoUrl: row.photo_url,
    }))
}

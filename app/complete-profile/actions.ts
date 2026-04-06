'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateNextMemberId } from '@/app/admin/members/actions'
import type { InsertTables, QueryResult, UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

export async function completeMemberProfile(formData: FormData) {
    const supabase = await createClient()

    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return { error: 'Not authenticated. Please log in again.' }
        }

        // IDEMPOTENCY CHECK: If member already exists for this user, handle carefully
        const { data: existingMember } = await supabaseAdmin
            .from('members')
            .select('id, status, full_name')
            .eq('user_id', user.id)
            .single() as { data: ExistingMember | null, error: unknown }

        if (existingMember) {
            // If the existing member is already active, this session likely belongs to a different
            // (already set-up) account — warn the user instead of silently redirecting them.
            if (existingMember.status !== 'inactive') {
                return {
                    error: `Your session is linked to an existing account (${existingMember.full_name}). Please log out and sign in with the correct new account before completing your profile.`
                }
            }
            // Genuine re-submit for an inactive member — safe to redirect
            revalidatePath('/member/dashboard')
            return { success: true }
        }

        // Get basic info from profiles
        const profileResult = await supabaseAdmin
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .single()
        const { data: profile, error: profileFetchError } = profileResult as unknown as QueryResult<ProfileRow | null>

        if (profileFetchError || !profile) {
            return { error: `Profile not found: ${getErrorMessage(profileFetchError, 'Unable to load profile')}` }
        }

        // Handle Photo Upload if present
        let photoUrl: string | null = null
        let uploadedPhotoPath: string | null = null
        const photoFile = formData.get('photo') as File | null
        if (photoFile && photoFile.size > 0) {
            const fileExt = photoFile.name.split('.').pop()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabaseAdmin.storage
                .from('avatars')
                .upload(fileName, photoFile, { upsert: true })

            if (!uploadError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('avatars')
                    .getPublicUrl(fileName)
                uploadedPhotoPath = fileName
                photoUrl = publicUrl
                await supabaseAdmin
                    .from('profiles')
                    .update(({ photo_url: photoUrl } satisfies UpdateTables<'profiles'>) as never)
                    .eq('id', user.id)
            } else {
                console.error('Photo upload failed:', getErrorMessage(uploadError, 'Unknown upload error'))
            }
        }

        // Generate a unique member ID with a timestamp fallback to prevent collisions
        let memberId = await generateNextMemberId()
        // Append timestamp suffix to guarantee uniqueness across concurrent inserts
        const conflictResult = await supabaseAdmin
            .from('members')
            .select('id')
            .eq('member_id', memberId)
            .single()
        const { data: conflict } = conflictResult as unknown as QueryResult<{ id: string } | null>
        if (conflict) {
            memberId = `GYM-${Date.now()}`
        }

        // Insert into members table using admin client (bypasses RLS)
        const memberPayload: InsertTables<'members'> = {
            user_id: user.id,
            member_id: memberId,
            full_name: profile.full_name,
            email: user.email,
            phone: profile.phone || '',
            photo_url: photoUrl,
            date_of_birth: (formData.get('date_of_birth') as string) || null,
            gender: ((formData.get('gender') as string) || null) as InsertTables<'members'>['gender'],
            address: (formData.get('address') as string) || null,
            emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
            emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
            status: 'inactive',
            membership_plan_id: null,
            membership_start_date: null,
            membership_expiry_date: null,
            referred_by: null,
        }

        const { error: memberError } = await supabaseAdmin
            .from('members')
            .insert(memberPayload as never)

        if (memberError) {
            if (uploadedPhotoPath) {
                await supabaseAdmin.storage.from('avatars').remove([uploadedPhotoPath])
                await supabaseAdmin
                    .from('profiles')
                    .update(({ photo_url: null } satisfies UpdateTables<'profiles'>) as never)
                    .eq('id', user.id)
            }
            const memberErrorMessage = getErrorMessage(memberError, 'Unknown member insert error')
            console.error('Member insert failed:', memberErrorMessage)
            return { error: `Failed to create member: ${memberErrorMessage}` }
        }

        // Handle referral code
        const rawCode = (formData.get('referral_code') as string | null)?.trim().toUpperCase()
        if (rawCode) {
            const referrerResult = await supabaseAdmin
                .from('members')
                .select('id')
                .eq('member_id', rawCode)
                .single()
            const { data: referrer } = referrerResult as unknown as QueryResult<{ id: string } | null>

            if (!referrer) {
                // Non-fatal: member is created, just skip referral linkage
                console.warn(`Referral code "${rawCode}" not found; skipping referral.`)
            } else {
                // Fetch the newly created member's id
                const newMemberResult = await supabaseAdmin
                    .from('members')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()
                const { data: newMember } = newMemberResult as unknown as QueryResult<{ id: string } | null>

                if (newMember) {
                    // Set referred_by on the new member
                    await supabaseAdmin
                        .from('members')
                        .update(({ referred_by: referrer.id } satisfies UpdateTables<'members'>) as never)
                        .eq('id', newMember.id)

                    // Create a referral record
                    const referralPayload: InsertTables<'referrals'> = {
                        referrer_id: referrer.id,
                        referred_id: newMember.id,
                        referral_code: rawCode,
                        status: 'pending',
                    }
                    await supabaseAdmin.from('referrals').insert(referralPayload as never)
                }
            }
        }

        revalidatePath('/member/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { error: error instanceof Error ? error.message : 'Failed to complete profile' }
    }
}
    type ExistingMember = { id: string; status: string; full_name: string }
    type ProfileRow = { full_name: string; phone: string | null }

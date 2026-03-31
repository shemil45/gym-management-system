'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function generateNextMemberId(): Promise<string> {
    const supabase = await createClient()

    // Only look at properly formatted GYM### IDs to avoid picking up numbers from mock/legacy data
    const { data: members } = await supabase
        .from('members')
        .select('member_id')
        .like('member_id', 'GYM%')
        .order('member_id', { ascending: false })

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

    try {
        // Generate member ID
        const memberId = await generateNextMemberId()

        // Get plan details
        const planId = formData.get('membership_plan_id') as string
        const { data: plan } = await supabase
            .from('membership_plans')
            .select('duration_days, price')
            .eq('id', planId)
            .single()

        if (!plan) {
            return { error: 'Invalid membership plan' }
        }

        // Calculate expiry date (add duration_days to start date)
        const startDate = new Date(formData.get('membership_start_date') as string)
        const expiryDate = new Date(startDate)
        expiryDate.setDate(expiryDate.getDate() + plan.duration_days)

        // Resolve referral code → referrer member
        const rawCode = (formData.get('referral_code') as string | null)?.trim().toUpperCase()
        let referrerId: string | null = null
        if (rawCode) {
            const { data: referrer } = await supabase
                .from('members')
                .select('id')
                .eq('member_id', rawCode)
                .single()
            if (!referrer) {
                return { error: `Referral code "${rawCode}" is not valid. Please check the member ID.` }
            }
            referrerId = referrer.id
        }

        // Create member
        const { data: member, error: memberError } = await supabase
            .from('members')
            .insert({
                member_id: memberId,
                full_name: formData.get('full_name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                date_of_birth: (formData.get('date_of_birth') as string) || null,
                gender: (formData.get('gender') as string) || null,
                address: (formData.get('address') as string) || null,
                emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
                emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
                membership_plan_id: planId,
                membership_start_date: startDate.toISOString().split('T')[0],
                membership_expiry_date: expiryDate.toISOString().split('T')[0],
                status: 'active',
                referred_by: referrerId,
            })
            .select()
            .single()

        if (memberError) {
            return { error: memberError.message }
        }

        // Create initial payment record
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                member_id: member.id,
                amount: formData.get('payment_amount') as string,
                payment_method: formData.get('payment_method') as string,
                payment_date: new Date().toISOString().split('T')[0],
                payment_type: 'membership_fee',
                description: `Initial membership fee`,
            })

        if (paymentError) {
            return { error: paymentError.message }
        }

        // If referred, create a referral record
        if (referrerId) {
            await supabase.from('referrals').insert({
                referrer_id: referrerId,
                referred_id: member.id,
                referral_code: rawCode,
                status: 'pending',
            })
        }

        revalidatePath('/admin/members')
        return { success: true, memberId: member.id }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create member'
        return { error: message }
    }
}

export async function updateMember(formData: FormData) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const memberId = formData.get('id') as string
        const planId = (formData.get('membership_plan_id') as string) || null
        const startDateValue = (formData.get('membership_start_date') as string) || null

        if (!memberId) {
            return { error: 'Member ID is required' }
        }

        let membershipExpiryDate: string | null = null
        if (planId && startDateValue) {
            const { data: plan } = await supabase
                .from('membership_plans')
                .select('duration_days')
                .eq('id', planId)
                .single()

            if (!plan) {
                return { error: 'Invalid membership plan' }
            }

            const startDate = new Date(startDateValue)
            const expiryDate = new Date(startDate)
            expiryDate.setDate(expiryDate.getDate() + plan.duration_days)
            membershipExpiryDate = expiryDate.toISOString().split('T')[0]
        }

        let photoUrl = (formData.get('existing_photo_url') as string) || null
        const photoFile = formData.get('photo') as File | null
        if (photoFile && photoFile.size > 0) {
            const fileExt = photoFile.name.split('.').pop()
            const fileName = `member-${memberId}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabaseAdmin.storage
                .from('avatars')
                .upload(fileName, photoFile, { upsert: true })

            if (uploadError) {
                return { error: uploadError.message }
            }

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('avatars')
                .getPublicUrl(fileName)

            photoUrl = publicUrl
        }

        const { error } = await supabase
            .from('members')
            .update({
                full_name: formData.get('full_name') as string,
                email: (formData.get('email') as string) || null,
                phone: formData.get('phone') as string,
                date_of_birth: (formData.get('date_of_birth') as string) || null,
                gender: (formData.get('gender') as string) || null,
                address: (formData.get('address') as string) || null,
                emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
                emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
                membership_plan_id: planId,
                membership_start_date: startDateValue,
                membership_expiry_date: membershipExpiryDate,
                status: formData.get('status') as string,
                photo_url: photoUrl,
            })
            .eq('id', memberId)

        if (error) {
            return { error: error.message }
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

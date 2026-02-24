'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateNextMemberId(): Promise<string> {
    const supabase = await createClient()

    // Get all member IDs to find the highest number
    const { data: members } = await supabase
        .from('members')
        .select('member_id')
        .order('member_id', { ascending: false })

    if (!members || members.length === 0) {
        return 'GYM001'
    }

    // Extract all numbers from member IDs and find the maximum
    let maxNumber = 0
    for (const member of members) {
        const match = member.member_id.match(/\d+/)
        if (match) {
            const num = parseInt(match[0])
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

        revalidatePath('/admin/members')
        return { success: true, memberId: member.id }
    } catch (err: any) {
        return { error: err.message || 'Failed to create member' }
    }
}

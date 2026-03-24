'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function purchasePlan(planId: string, paymentMethod: string) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) return { error: 'Not authenticated' }

        // Get the member record
        const { data: member } = await supabaseAdmin
            .from('members')
            .select('id, membership_expiry_date')
            .eq('user_id', user.id)
            .single()

        if (!member) return { error: 'Member record not found' }

        // Get the plan details
        const { data: plan } = await supabaseAdmin
            .from('membership_plans')
            .select('*')
            .eq('id', planId)
            .single()

        if (!plan) return { error: 'Plan not found' }

        // Calculate dates: start from today or from expiry if already active
        const today = new Date()
        const currentExpiry = member.membership_expiry_date ? new Date(member.membership_expiry_date) : null
        const startDate = (currentExpiry && currentExpiry > today) ? currentExpiry : today
        const expiryDate = new Date(startDate)
        expiryDate.setDate(expiryDate.getDate() + (plan as any).duration_days)

        const startStr = startDate.toISOString().split('T')[0]
        const expiryStr = expiryDate.toISOString().split('T')[0]

        // Generate invoice number
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
        const rand = Math.floor(1000 + Math.random() * 9000)
        const invoiceNumber = `INV-${dateStr}-${rand}`

        // Record payment
        const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .insert({
                member_id: member.id,
                amount: (plan as any).price,
                payment_method: paymentMethod,
                payment_status: 'pending', // pending until manually confirmed or online payment
                payment_date: startStr,
                invoice_number: invoiceNumber,
                membership_start_date: startStr,
                membership_end_date: expiryStr,
                notes: `Self-service plan purchase: ${(plan as any).name}`,
            })

        if (paymentError) return { error: paymentError.message }

        // Update the member's plan and status
        const { error: memberError } = await supabaseAdmin
            .from('members')
            .update({
                membership_plan_id: planId,
                membership_start_date: startStr,
                membership_expiry_date: expiryStr,
                status: 'active',
            })
            .eq('id', member.id)

        if (memberError) return { error: memberError.message }

        revalidatePath('/member/dashboard')
        revalidatePath('/member/plans')
        revalidatePath('/member/payments')
        return { success: true, invoiceNumber }
    } catch (err: any) {
        return { error: err.message || 'Failed to purchase plan' }
    }
}

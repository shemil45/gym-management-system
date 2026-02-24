'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function recordPayment(formData: FormData) {
    const supabase = await createClient()

    try {
        const memberId = formData.get('member_id') as string
        const amount = parseFloat(formData.get('amount') as string)
        const paymentMethod = formData.get('payment_method') as string
        const paymentStatus = (formData.get('payment_status') as string) || 'paid'
        const paymentDate = (formData.get('payment_date') as string) || new Date().toISOString().split('T')[0]
        const planId = formData.get('plan_id') as string | null
        const notes = (formData.get('notes') as string) || null
        const renewMembership = formData.get('renew_membership') === 'true'

        if (!memberId || !amount || !paymentMethod) {
            return { error: 'Member, amount, and payment method are required' }
        }

        // Generate invoice number: INV-YYYYMMDD-XXXX
        const dateStr = paymentDate.replace(/-/g, '')
        const rand = Math.floor(1000 + Math.random() * 9000)
        const invoiceNumber = `INV-${dateStr}-${rand}`

        // Build payment insert payload
        const paymentPayload: Record<string, unknown> = {
            member_id: memberId,
            amount,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            payment_date: paymentDate,
            invoice_number: invoiceNumber,
            notes,
        }

        const { error: paymentError } = await supabase
            .from('payments')
            .insert(paymentPayload)

        if (paymentError) return { error: paymentError.message }

        // Optionally renew the membership
        if (renewMembership && planId && paymentStatus === 'paid') {
            const { data: plan } = await supabase
                .from('membership_plans')
                .select('duration_days')
                .eq('id', planId)
                .single()

            if (plan) {
                const startDate = new Date(paymentDate)
                const expiryDate = new Date(startDate)
                expiryDate.setDate(expiryDate.getDate() + plan.duration_days)

                await supabase
                    .from('members')
                    .update({
                        membership_plan_id: planId,
                        membership_start_date: startDate.toISOString().split('T')[0],
                        membership_expiry_date: expiryDate.toISOString().split('T')[0],
                        status: 'active',
                    })
                    .eq('id', memberId)
            }
        }

        revalidatePath('/admin/payments')
        revalidatePath('/admin/members')
        return { success: true, invoiceNumber }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to record payment'
        return { error: message }
    }
}

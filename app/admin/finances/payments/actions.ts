'use server'

import { createClient } from '@/lib/supabase/server'
import type { InsertTables, QueryResult, UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

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
        let membershipStartDate: string | null = null
        let membershipEndDate: string | null = null

        if (renewMembership && planId && paymentStatus === 'paid') {
            const memberResult = await supabase
                .from('members')
                .select('membership_expiry_date')
                .eq('id', memberId)
                .single()
            const { data: member, error: memberError } = memberResult as unknown as QueryResult<{ membership_expiry_date: string | null } | null>

            if (memberError) return { error: getErrorMessage(memberError, 'Failed to fetch member details') }

            const planResult = await supabase
                .from('membership_plans')
                .select('duration_days')
                .eq('id', planId)
                .single()
            const { data: plan } = planResult as unknown as QueryResult<{ duration_days: number } | null>

            if (plan) {
                const paymentStartDate = new Date(paymentDate)
                const currentExpiry = member?.membership_expiry_date ? new Date(member.membership_expiry_date) : null
                const startDate =
                    currentExpiry && currentExpiry > paymentStartDate
                        ? currentExpiry
                        : paymentStartDate
                const expiryDate = new Date(startDate)
                expiryDate.setDate(expiryDate.getDate() + plan.duration_days)
                membershipStartDate = startDate.toISOString().split('T')[0]
                membershipEndDate = expiryDate.toISOString().split('T')[0]
            }
        }

        // Build payment insert payload
        const paymentPayload: InsertTables<'payments'> = {
            member_id: memberId,
            amount,
            payment_method: paymentMethod as InsertTables<'payments'>['payment_method'],
            payment_status: paymentStatus as InsertTables<'payments'>['payment_status'],
            payment_date: paymentDate,
            invoice_number: invoiceNumber,
            notes,
            membership_start_date: membershipStartDate,
            membership_end_date: membershipEndDate,
        }

        const { error: paymentError } = await supabase
            .from('payments')
            .insert(paymentPayload as never)

        if (paymentError) return { error: getErrorMessage(paymentError, 'Failed to record payment') }

        if (renewMembership && planId && paymentStatus === 'paid' && membershipStartDate && membershipEndDate) {
            const { error: updateMemberError } = await supabase
                .from('members')
                .update(({
                    membership_plan_id: planId,
                    membership_start_date: membershipStartDate,
                    membership_expiry_date: membershipEndDate,
                    status: 'active',
                } satisfies UpdateTables<'members'>) as never)
                .eq('id', memberId)

            if (updateMemberError) return { error: getErrorMessage(updateMemberError, 'Failed to update member membership') }
        }

        revalidatePath('/admin/finances/payments')
        revalidatePath('/admin/members')
        return { success: true, invoiceNumber }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to record payment'
        return { error: message }
    }
}

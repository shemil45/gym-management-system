'use server'

import { createClient } from '@/lib/supabase/server'
import type { InsertTables, QueryResult, UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { invalidateGymAdminSummaries } from '@/lib/auth/admin-server'
import { sendMemberWhatsAppNotification } from '@/lib/notifications/service'

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

        const memberGymResult = await supabase
            .from('members')
            .select('gym_id')
            .eq('id', memberId)
            .single()
        const { data: memberGymRow, error: memberGymError } = memberGymResult as unknown as QueryResult<{ gym_id: string | null } | null>

        if (memberGymError) return { error: getErrorMessage(memberGymError, 'Failed to resolve member') }
        if (!memberGymRow?.gym_id) return { error: 'Member is not linked to a gym' }

        const { data: receiptNumber, error: receiptNumberError } = await supabase.rpc('generate_receipt_number', {
            p_gym_id: memberGymRow.gym_id,
        } as never)

        if (receiptNumberError) return { error: getErrorMessage(receiptNumberError, 'Failed to generate receipt number') }

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
            receipt_number: receiptNumber,
            notes,
            membership_start_date: membershipStartDate,
            membership_end_date: membershipEndDate,
        }

        const paymentInsertResult = await supabase
            .from('payments')
            .insert(paymentPayload as never)
            .select('gym_id')
            .single()
        const { data: insertedPayment, error: paymentError } = paymentInsertResult as unknown as QueryResult<{ gym_id: string } | null>

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

        if (insertedPayment?.gym_id) {
            invalidateGymAdminSummaries(insertedPayment.gym_id)
        }

        let notificationWarning: string | undefined

        if (paymentStatus === 'paid') {
            const wasRenewal = Boolean(membershipStartDate && membershipEndDate)
            const confirmationResult = await sendMemberWhatsAppNotification({
                memberId,
                notificationType: 'payment_received',
                source: 'api',
                confirmationKind: wasRenewal ? 'renewal' : 'payment',
            })

            if (!confirmationResult.success) {
                notificationWarning = `Payment recorded, but the confirmation WhatsApp could not be sent: ${confirmationResult.error}`
                console.warn('[payments] Confirmation WhatsApp was not sent after payment', {
                    memberId,
                    error: confirmationResult.error,
                })
            }
        }

        revalidatePath('/admin/finances/payments')
        revalidatePath('/admin/members')
        return { success: true, invoiceNumber, notificationWarning }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to record payment'
        return { error: message }
    }
}

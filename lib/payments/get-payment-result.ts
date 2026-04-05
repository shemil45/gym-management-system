import 'server-only'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import type { ProfileRole } from '@/lib/auth/roles'
import { isStaffRole } from '@/lib/auth/roles'

export type PaymentResult =
    | {
        success: true
        payment: {
            amount: number
            coinsUsed: number
            invoiceNumber: string
            membershipEndDate: string | null
            membershipStartDate: string | null
            originalPrice: number
            paymentDate: string
            paymentMethod: string
            paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded'
            planName: string
            razorpayOrderId: string | null
            razorpayPaymentId: string | null
        }
    }
    | { error: string }

function getSupabaseAdmin() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function getPaymentResultForViewer(invoiceNumber: string): Promise<PaymentResult> {
    try {
        const supabase = await createClient()
        const supabaseAdmin = getSupabaseAdmin()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return { error: 'Not authenticated' }
        }

        type ViewerProfile = { role: ProfileRole }

        const profileResult = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        const { data: profile } = profileResult as unknown as QueryResult<ViewerProfile | null>

        if (!profile) {
            return { error: 'Profile not found' }
        }

        let paymentQuery = supabaseAdmin
            .from('payments')
            .select('member_id, amount, invoice_number, membership_start_date, membership_end_date, payment_date, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, notes')
            .eq('invoice_number', invoiceNumber)

        if (!isStaffRole(profile.role)) {
            const { data: member } = await supabaseAdmin
                .from('members')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!member) {
                return { error: 'Member record not found' }
            }

            paymentQuery = paymentQuery.eq('member_id', member.id)
        }

        const { data: payment } = await paymentQuery.maybeSingle()

        if (!payment || !payment.invoice_number) {
            return { error: 'Payment record not found' }
        }

        const planNameMatch = payment.notes?.match(/Razorpay purchase: (.+?)(?:\.|$)/)
        const coinsMatch = payment.notes?.match(/Referral coins (?:used|reserved): (\d+)/)
        const coinsUsed = coinsMatch ? Number(coinsMatch[1]) : 0
        const finalAmount = Number(payment.amount)
        const originalPrice = finalAmount + coinsUsed

        return {
            success: true,
            payment: {
                amount: finalAmount,
                coinsUsed,
                invoiceNumber: payment.invoice_number,
                membershipEndDate: payment.membership_end_date,
                membershipStartDate: payment.membership_start_date,
                originalPrice,
                paymentDate: payment.payment_date,
                paymentMethod: payment.payment_method,
                paymentStatus: payment.payment_status,
                planName: planNameMatch?.[1] || 'Membership Plan',
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
            },
        }
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to fetch payment result' }
    }
}

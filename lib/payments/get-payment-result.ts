import 'server-only'

import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

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

export async function getPaymentResultForViewer(invoiceNumber: string): Promise<PaymentResult> {
    try {
        const viewer = await getCurrentGymContext()
        const supabaseAdmin = getSupabaseAdmin()

        if (!viewer.user || !viewer.gym) {
            return { error: 'Not authenticated' }
        }

        let paymentQuery = supabaseAdmin
            .from('payments')
            .select('member_id, amount, invoice_number, membership_start_date, membership_end_date, payment_date, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, notes')
            .eq('gym_id', viewer.gym.id)
            .eq('invoice_number', invoiceNumber)

        if (!viewer.isStaff) {
            if (!viewer.member) {
                return { error: 'Member record not found' }
            }

            paymentQuery = paymentQuery.eq('member_id', viewer.member.id)
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

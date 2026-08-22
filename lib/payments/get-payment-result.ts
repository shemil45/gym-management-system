import 'server-only'

import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

import type { PaymentReceipt, ReceiptGym } from '@/lib/payments/receipt'

/** Kept as an alias so existing importers of this name keep working. */
export type PaymentReceiptGym = ReceiptGym

export type PaymentResult = { success: true; payment: PaymentReceipt } | { error: string }

type PaymentRow = {
    member_id: string | null
    amount: number
    invoice_number: string | null
    receipt_number: string | null
    admission_fee_amount: number | null
    membership_start_date: string | null
    membership_end_date: string | null
    payment_date: string
    payment_method: string
    payment_status: 'paid' | 'pending' | 'failed' | 'refunded'
    razorpay_order_id: string | null
    razorpay_payment_id: string | null
    notes: string | null
    members: { member_id: string; full_name: string } | null
    gyms: {
        name: string
        logo_url: string | null
        address: string | null
        city: string | null
        state: string | null
        postal_code: string | null
        country: string | null
        contact_phone: string | null
        contact_email: string | null
        gstin: string | null
        receipt_show_logo: boolean
        receipt_show_address: boolean
        receipt_show_phone: boolean
        receipt_show_email: boolean
        receipt_show_gstin: boolean
        receipt_footer_message: string | null
        receipt_additional_notes: string | null
    } | null
}

const PAYMENT_RECEIPT_SELECT = `
    member_id, amount, invoice_number, receipt_number, admission_fee_amount,
    membership_start_date, membership_end_date, payment_date, payment_method,
    payment_status, razorpay_order_id, razorpay_payment_id, notes,
    members ( member_id, full_name ),
    gyms:gym_id ( name, logo_url, address, city, state, postal_code, country, contact_phone, contact_email, gstin,
        receipt_show_logo, receipt_show_address, receipt_show_phone, receipt_show_email, receipt_show_gstin,
        receipt_footer_message, receipt_additional_notes )
`

function toReceiptGym(gym: PaymentRow['gyms']): PaymentReceiptGym {
    return {
        name: gym?.name ?? '',
        logoUrl: gym?.logo_url ?? null,
        address: gym?.address ?? null,
        city: gym?.city ?? null,
        state: gym?.state ?? null,
        postalCode: gym?.postal_code ?? null,
        country: gym?.country ?? null,
        contactPhone: gym?.contact_phone ?? null,
        contactEmail: gym?.contact_email ?? null,
        gstin: gym?.gstin ?? null,
        showLogo: gym?.receipt_show_logo ?? true,
        showAddress: gym?.receipt_show_address ?? true,
        showPhone: gym?.receipt_show_phone ?? true,
        showEmail: gym?.receipt_show_email ?? true,
        showGstin: gym?.receipt_show_gstin ?? true,
        footerMessage: gym?.receipt_footer_message ?? null,
        additionalNotes: gym?.receipt_additional_notes ?? null,
    }
}

export async function getPaymentResultForViewer(invoiceNumber: string): Promise<PaymentResult> {
    try {
        const viewer = await getCurrentGymContext()
        const supabaseAdmin = getSupabaseAdmin()

        if (!viewer.user || !viewer.gym) {
            return { error: 'Not authenticated' }
        }

        let paymentQuery = supabaseAdmin
            .from('payments')
            .select(PAYMENT_RECEIPT_SELECT)
            .eq('gym_id', viewer.gym.id)
            .eq('invoice_number', invoiceNumber)

        if (!viewer.isStaff) {
            if (!viewer.member) {
                return { error: 'Member record not found' }
            }

            paymentQuery = paymentQuery.eq('member_id', viewer.member.id)
        }

        const { data } = await paymentQuery.maybeSingle()
        const payment = data as unknown as PaymentRow | null

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
                receiptNumber: payment.receipt_number,
                admissionFeeAmount: payment.admission_fee_amount,
                membershipEndDate: payment.membership_end_date,
                membershipStartDate: payment.membership_start_date,
                originalPrice,
                paymentDate: payment.payment_date,
                paymentMethod: payment.payment_method,
                paymentStatus: payment.payment_status,
                planName: planNameMatch?.[1] || 'Membership Plan',
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
                memberDisplayId: payment.members?.member_id ?? '-',
                memberFullName: payment.members?.full_name ?? '-',
                gym: toReceiptGym(payment.gyms),
            },
        }
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to fetch payment result' }
    }
}

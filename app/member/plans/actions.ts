'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type PurchaseContext = {
    availableCoins: number
    coinsUsed: number
    currentExpiry: string | null
    email: string
    expiryDate: string
    finalAmount: number
    fullName: string
    invoiceNumber: string
    memberId: string
    paymentDate: string
    phone: string
    planDurationDays: number
    planId: string
    planName: string
    price: number
    startDate: string
}

type CreateOrderResult =
    | {
        success: true
        amount: number
        currency: 'INR'
        invoiceNumber: string
        keyId: string
        orderId: string
        prefills: {
            email: string
            name: string
            phone: string
        }
    }
    | { error: string }

type VerifyPaymentResult =
    | { success: true; invoiceNumber: string }
    | { error: string }

type PaymentResultDetails =
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

function ensureRazorpayConfig() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment.')
    }
}

function generateInvoiceNumber(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `INV-${dateStr}-${rand}`
}

async function getPurchaseContext(planId: string, useReferralCoins: boolean): Promise<PurchaseContext> {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('Not authenticated')
    }

    const { data: member } = await supabaseAdmin
        .from('members')
        .select('id, full_name, email, phone, membership_expiry_date, referral_coins_balance')
        .eq('user_id', user.id)
        .single()

    if (!member) {
        throw new Error('Member record not found')
    }

    const { data: plan } = await supabaseAdmin
        .from('membership_plans')
        .select('id, name, price, duration_days, is_active')
        .eq('id', planId)
        .single()

    if (!plan || !plan.is_active) {
        throw new Error('Plan not found')
    }

    const today = new Date()
    const currentExpiry = member.membership_expiry_date ? new Date(member.membership_expiry_date) : null
    const startDate = currentExpiry && currentExpiry > today ? currentExpiry : today
    const expiryDate = new Date(startDate)
    expiryDate.setDate(expiryDate.getDate() + plan.duration_days)

    const startStr = startDate.toISOString().split('T')[0]
    const expiryStr = expiryDate.toISOString().split('T')[0]
    const availableCoins = member.referral_coins_balance || 0
    const coinsUsed = useReferralCoins ? Math.min(availableCoins, Number(plan.price)) : 0
    const finalAmount = Math.max(0, Number(plan.price) - coinsUsed)

    return {
        availableCoins,
        coinsUsed,
        currentExpiry: member.membership_expiry_date,
        email: member.email || '',
        expiryDate: expiryStr,
        finalAmount,
        fullName: member.full_name || '',
        invoiceNumber: generateInvoiceNumber(today),
        memberId: member.id,
        paymentDate: today.toISOString().split('T')[0],
        phone: member.phone || '',
        planDurationDays: plan.duration_days,
        planId: plan.id,
        planName: plan.name,
        price: Number(plan.price),
        startDate: startStr,
    }
}

async function applyMembershipAfterPayment(context: PurchaseContext, razorpayOrderId: string | null, razorpayPaymentId: string | null) {
    const supabaseAdmin = getSupabaseAdmin()

    const { error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
            member_id: context.memberId,
            amount: context.finalAmount,
            payment_method: 'online',
            payment_status: 'paid',
            payment_date: context.paymentDate,
            invoice_number: context.invoiceNumber,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            membership_start_date: context.startDate,
            membership_end_date: context.expiryDate,
            notes:
                context.coinsUsed > 0
                    ? `Self-service Razorpay purchase: ${context.planName}. Referral coins used: ${context.coinsUsed}.`
                    : `Self-service Razorpay purchase: ${context.planName}.`,
        })

    if (paymentError) {
        throw new Error(paymentError.message)
    }

    const { error: memberError } = await supabaseAdmin
        .from('members')
        .update({
            membership_plan_id: context.planId,
            membership_start_date: context.startDate,
            membership_expiry_date: context.expiryDate,
            status: 'active',
            referral_coins_balance: context.availableCoins - context.coinsUsed,
        })
        .eq('id', context.memberId)

    if (memberError) {
        throw new Error(memberError.message)
    }

    const { data: appliedReferrals } = await supabaseAdmin
        .from('referrals')
        .update({
            status: 'applied',
            applied_at: new Date().toISOString(),
        })
        .select('referrer_id')
        .eq('referred_id', context.memberId)
        .eq('status', 'pending')

    if (appliedReferrals && appliedReferrals.length > 0) {
        for (const referral of appliedReferrals) {
            const { data: referrer } = await supabaseAdmin
                .from('members')
                .select('id, referral_coins_balance')
                .eq('id', referral.referrer_id)
                .single()

            if (referrer) {
                await supabaseAdmin
                    .from('members')
                    .update({ referral_coins_balance: (referrer.referral_coins_balance || 0) + 500 })
                    .eq('id', referrer.id)
            }
        }
    }

    revalidatePath('/member/dashboard')
    revalidatePath('/member/plans')
    revalidatePath('/member/payments')
    revalidatePath('/member/referrals')
}

export async function createRazorpayOrder(planId: string, useReferralCoins = true): Promise<CreateOrderResult> {
    try {
        ensureRazorpayConfig()

        const context = await getPurchaseContext(planId, useReferralCoins)

        if (context.finalAmount <= 0) {
            await applyMembershipAfterPayment(context, null, null)
            return {
                success: true,
                amount: 0,
                currency: 'INR',
                invoiceNumber: context.invoiceNumber,
                keyId: process.env.RAZORPAY_KEY_ID!,
                orderId: 'FREE_PLAN',
                prefills: {
                    email: context.email,
                    name: context.fullName,
                    phone: context.phone,
                },
            }
        }

        const supabaseAdmin = getSupabaseAdmin()

        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID!}:${process.env.RAZORPAY_KEY_SECRET!}`).toString('base64')
        const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Math.round(context.finalAmount * 100),
                currency: 'INR',
                receipt: context.invoiceNumber,
                notes: {
                    invoice_number: context.invoiceNumber,
                    member_id: context.memberId,
                    membership_end_date: context.expiryDate,
                    membership_start_date: context.startDate,
                    plan_id: context.planId,
                    plan_name: context.planName,
                    referral_coins_used: String(context.coinsUsed),
                },
            }),
        })

        const payload = await orderResponse.json()

        if (!orderResponse.ok || !payload.id) {
            return { error: payload.error?.description || 'Unable to create Razorpay order' }
        }

        const { error: pendingPaymentError } = await supabaseAdmin
            .from('payments')
            .insert({
                member_id: context.memberId,
                amount: context.finalAmount,
                payment_method: 'online',
                payment_status: 'pending',
                payment_date: context.paymentDate,
                invoice_number: context.invoiceNumber,
                razorpay_order_id: payload.id,
                membership_start_date: context.startDate,
                membership_end_date: context.expiryDate,
                notes:
                    context.coinsUsed > 0
                        ? `Pending self-service Razorpay purchase: ${context.planName}. Referral coins reserved: ${context.coinsUsed}.`
                        : `Pending self-service Razorpay purchase: ${context.planName}.`,
            })

        if (pendingPaymentError) {
            return { error: pendingPaymentError.message }
        }

        return {
            success: true,
            amount: payload.amount,
            currency: 'INR',
            invoiceNumber: context.invoiceNumber,
            keyId: process.env.RAZORPAY_KEY_ID!,
            orderId: payload.id,
            prefills: {
                email: context.email,
                name: context.fullName,
                phone: context.phone,
            },
        }
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to create Razorpay order' }
    }
}

export async function verifyRazorpayPayment(input: {
    planId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
    useReferralCoins?: boolean
}): Promise<VerifyPaymentResult> {
    try {
        ensureRazorpayConfig()

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
            .digest('hex')

        if (expectedSignature !== input.razorpaySignature) {
            return { error: 'Payment verification failed' }
        }

        const context = await getPurchaseContext(input.planId, input.useReferralCoins ?? true)
        const supabaseAdmin = getSupabaseAdmin()

        const { data: existingPayment } = await supabaseAdmin
            .from('payments')
            .select('id, payment_status, invoice_number')
            .eq('member_id', context.memberId)
            .eq('razorpay_order_id', input.razorpayOrderId)
            .maybeSingle()

        if (!existingPayment) {
            return { error: 'Pending payment record not found' }
        }

        if (existingPayment.payment_status === 'paid') {
            return { success: true, invoiceNumber: existingPayment.invoice_number || context.invoiceNumber }
        }

        const { error: updatePendingError } = await supabaseAdmin
            .from('payments')
            .update({
                payment_status: 'paid',
                razorpay_payment_id: input.razorpayPaymentId,
            })
            .eq('id', existingPayment.id)

        if (updatePendingError) {
            return { error: updatePendingError.message }
        }

        const { error: memberError } = await supabaseAdmin
            .from('members')
            .update({
                membership_plan_id: context.planId,
                membership_start_date: context.startDate,
                membership_expiry_date: context.expiryDate,
                status: 'active',
                referral_coins_balance: context.availableCoins - context.coinsUsed,
            })
            .eq('id', context.memberId)

        if (memberError) {
            return { error: memberError.message }
        }

        const { data: appliedReferrals } = await supabaseAdmin
            .from('referrals')
            .update({
                status: 'applied',
                applied_at: new Date().toISOString(),
            })
            .select('referrer_id')
            .eq('referred_id', context.memberId)
            .eq('status', 'pending')

        if (appliedReferrals && appliedReferrals.length > 0) {
            for (const referral of appliedReferrals) {
                const { data: referrer } = await supabaseAdmin
                    .from('members')
                    .select('id, referral_coins_balance')
                    .eq('id', referral.referrer_id)
                    .single()

                if (referrer) {
                    await supabaseAdmin
                        .from('members')
                        .update({ referral_coins_balance: (referrer.referral_coins_balance || 0) + 500 })
                        .eq('id', referrer.id)
                }
            }
        }

        revalidatePath('/member/dashboard')
        revalidatePath('/member/plans')
        revalidatePath('/member/payments')
        revalidatePath('/member/referrals')

        return { success: true, invoiceNumber: existingPayment.invoice_number || context.invoiceNumber }
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to verify payment' }
    }
}

export async function markRazorpayPaymentFailed(input: {
    razorpayOrderId: string
    reason?: string
}) {
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

        const { data: member } = await supabaseAdmin
            .from('members')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!member) {
            return { error: 'Member record not found' }
        }

        const { error } = await supabaseAdmin
            .from('payments')
            .update({
                payment_status: 'failed',
                notes: input.reason
                    ? `Razorpay payment failed or cancelled. Reason: ${input.reason}`
                    : 'Razorpay payment failed or was cancelled by the user.',
            })
            .eq('member_id', member.id)
            .eq('razorpay_order_id', input.razorpayOrderId)
            .eq('payment_status', 'pending')

        if (error) {
            return { error: error.message }
        }

        revalidatePath('/member/payments')
        revalidatePath('/member/plans')
        return { success: true }
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to update payment status' }
    }
}

export async function getPaymentResult(invoiceNumber: string): Promise<PaymentResultDetails> {
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

        const { data: member } = await supabaseAdmin
            .from('members')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!member) {
            return { error: 'Member record not found' }
        }

        const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('amount, invoice_number, membership_start_date, membership_end_date, payment_date, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, notes')
            .eq('member_id', member.id)
            .eq('invoice_number', invoiceNumber)
            .maybeSingle()

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

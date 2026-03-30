'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function purchasePlan(planId: string, paymentMethod: string, useReferralCoins = true) {
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
            .select('id, membership_expiry_date, referral_coins_balance')
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
        const availableCoins = member.referral_coins_balance || 0
        const coinsUsed = useReferralCoins ? Math.min(availableCoins, Number((plan as any).price)) : 0
        const finalAmount = Math.max(0, Number((plan as any).price) - coinsUsed)

        // Generate invoice number
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
        const rand = Math.floor(1000 + Math.random() * 9000)
        const invoiceNumber = `INV-${dateStr}-${rand}`

        // Record payment as paid immediately (no payment gateway)
        const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .insert({
                member_id: member.id,
                amount: finalAmount,
                payment_method: paymentMethod,
                payment_status: 'paid',
                payment_date: startStr,
                invoice_number: invoiceNumber,
                membership_start_date: startStr,
                membership_end_date: expiryStr,
                notes: coinsUsed > 0
                    ? `Self-service plan purchase: ${(plan as any).name}. Referral coins used: ${coinsUsed}.`
                    : `Self-service plan purchase: ${(plan as any).name}`,
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
                referral_coins_balance: availableCoins - coinsUsed,
            })
            .eq('id', member.id)

        if (memberError) return { error: memberError.message }

        // Auto-apply any pending referral for this member and credit the referrer.
        const { data: appliedReferrals } = await supabaseAdmin
            .from('referrals')
            .update({
                status: 'applied',
                applied_at: new Date().toISOString(),
            })
            .select('referrer_id')
            .eq('referred_id', member.id)
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
        return { success: true, invoiceNumber }
    } catch (err: any) {
        return { error: err.message || 'Failed to purchase plan' }
    }
}

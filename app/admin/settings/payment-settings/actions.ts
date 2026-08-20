'use server'

import { createClient } from '@/lib/supabase/server'
import type { UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank_transfer'] as const
type PaymentMethod = (typeof PAYMENT_METHODS)[number]

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

export async function updatePaymentSettings(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }

    const enabled: Record<PaymentMethod, boolean> = {
        cash: formData.get('payment_method_cash_enabled') === 'true',
        upi: formData.get('payment_method_upi_enabled') === 'true',
        card: formData.get('payment_method_card_enabled') === 'true',
        bank_transfer: formData.get('payment_method_bank_transfer_enabled') === 'true',
    }

    if (!PAYMENT_METHODS.some((method) => enabled[method])) {
        return { error: 'At least one payment method must be enabled.' }
    }

    const defaultPaymentMethod = formData.get('default_payment_method') as string | null
    if (!defaultPaymentMethod || !PAYMENT_METHODS.includes(defaultPaymentMethod as PaymentMethod)) {
        return { error: 'Please select a valid default payment method.' }
    }
    if (!enabled[defaultPaymentMethod as PaymentMethod]) {
        return { error: 'The default payment method must be enabled.' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('gyms')
        .update(({
            payment_method_cash_enabled: enabled.cash,
            payment_method_upi_enabled: enabled.upi,
            payment_method_card_enabled: enabled.card,
            payment_method_bank_transfer_enabled: enabled.bank_transfer,
            default_payment_method: defaultPaymentMethod,
        } satisfies UpdateTables<'gyms'>) as never)
        .eq('id', viewer.gym.id)

    if (error) return { error: getErrorMessage(error, 'Failed to update payment settings') }

    revalidatePath('/admin/settings/payment-settings')
    revalidatePath('/admin/finances/payments/record')
    return { success: true }
}

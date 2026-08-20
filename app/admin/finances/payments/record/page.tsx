import { createClient } from '@/lib/supabase/server'
import RecordPaymentForm from '@/components/forms/RecordPaymentForm'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import type { QueryResult, Tables } from '@/lib/types'

type PaymentSettingsFields = Pick<Tables<'gyms'>,
    'payment_method_cash_enabled' | 'payment_method_upi_enabled' |
    'payment_method_card_enabled' | 'payment_method_bank_transfer_enabled' |
    'default_payment_method'>

const ALL_PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
]

export default async function FinancesRecordPaymentPage() {
    const supabase = await createClient()
    const { gym } = await getCurrentGymContext()

    const { data: members } = await supabase
        .from('members')
        .select('id, member_id, full_name, photo_url, status, membership_expiry_date, membership_plan:membership_plans(id, name, price, duration_days)')
        .in('status', ['active', 'expired', 'inactive'])
        .order('full_name')

    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name, price, duration_days')
        .eq('is_active', true)
        .order('price')

    let paymentMethods = ALL_PAYMENT_METHODS
    let defaultPaymentMethod = ''

    if (gym) {
        const gymResult = await supabase
            .from('gyms')
            .select('payment_method_cash_enabled, payment_method_upi_enabled, payment_method_card_enabled, payment_method_bank_transfer_enabled, default_payment_method')
            .eq('id', gym.id)
            .single()
        const { data: paymentSettings } = gymResult as unknown as QueryResult<PaymentSettingsFields | null>

        const enabledMap: Record<string, boolean> = {
            cash: paymentSettings?.payment_method_cash_enabled ?? true,
            upi: paymentSettings?.payment_method_upi_enabled ?? true,
            card: paymentSettings?.payment_method_card_enabled ?? true,
            bank_transfer: paymentSettings?.payment_method_bank_transfer_enabled ?? true,
        }
        paymentMethods = ALL_PAYMENT_METHODS.filter((method) => enabledMap[method.value])
        defaultPaymentMethod = paymentSettings?.default_payment_method ?? ''
    }

    return (
        <RecordPaymentForm
            members={members || []}
            plans={plans || []}
            paymentMethods={paymentMethods}
            defaultPaymentMethod={defaultPaymentMethod}
        />
    )
}

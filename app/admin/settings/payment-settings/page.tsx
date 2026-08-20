import { redirect } from 'next/navigation'
import PaymentSettings from '@/components/settings/PaymentSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type PaymentSettingsFields = Pick<Tables<'gyms'>,
    'payment_method_cash_enabled' | 'payment_method_upi_enabled' |
    'payment_method_card_enabled' | 'payment_method_bank_transfer_enabled' |
    'default_payment_method'>

export default async function PaymentSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member/dashboard')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('payment_method_cash_enabled, payment_method_upi_enabled, payment_method_card_enabled, payment_method_bank_transfer_enabled, default_payment_method')
        .eq('id', gym.id)
        .single()
    const { data: paymentSettings } = gymResult as unknown as QueryResult<PaymentSettingsFields | null>

    return (
        <PaymentSettings
            gym={{
                payment_method_cash_enabled: paymentSettings?.payment_method_cash_enabled ?? true,
                payment_method_upi_enabled: paymentSettings?.payment_method_upi_enabled ?? true,
                payment_method_card_enabled: paymentSettings?.payment_method_card_enabled ?? true,
                payment_method_bank_transfer_enabled: paymentSettings?.payment_method_bank_transfer_enabled ?? true,
                default_payment_method: paymentSettings?.default_payment_method ?? 'cash',
            }}
        />
    )
}

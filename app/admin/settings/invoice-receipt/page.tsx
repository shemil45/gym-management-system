import { redirect } from 'next/navigation'
import InvoiceReceiptSettings from '@/components/settings/InvoiceReceiptSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type ReceiptSettingsFields = Pick<Tables<'gyms'>,
    'receipt_prefix' | 'receipt_next_number' | 'receipt_show_logo' | 'receipt_show_address' |
    'receipt_show_phone' | 'receipt_show_email' | 'receipt_show_gstin' |
    'receipt_footer_message' | 'receipt_additional_notes' | 'logo_url'>

export default async function InvoiceReceiptSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member/dashboard')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('receipt_prefix, receipt_next_number, receipt_show_logo, receipt_show_address, receipt_show_phone, receipt_show_email, receipt_show_gstin, receipt_footer_message, receipt_additional_notes, logo_url')
        .eq('id', gym.id)
        .single()
    const { data: receiptSettings } = gymResult as unknown as QueryResult<ReceiptSettingsFields | null>

    return (
        <InvoiceReceiptSettings
            gym={{
                receipt_prefix: receiptSettings?.receipt_prefix ?? 'REC-',
                receipt_next_number: receiptSettings?.receipt_next_number ?? 1,
                receipt_show_logo: receiptSettings?.receipt_show_logo ?? true,
                receipt_show_address: receiptSettings?.receipt_show_address ?? true,
                receipt_show_phone: receiptSettings?.receipt_show_phone ?? true,
                receipt_show_email: receiptSettings?.receipt_show_email ?? true,
                receipt_show_gstin: receiptSettings?.receipt_show_gstin ?? true,
                receipt_footer_message: receiptSettings?.receipt_footer_message ?? null,
                receipt_additional_notes: receiptSettings?.receipt_additional_notes ?? null,
                logo_url: receiptSettings?.logo_url ?? null,
            }}
        />
    )
}

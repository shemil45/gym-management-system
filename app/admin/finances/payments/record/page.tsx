import { createClient } from '@/lib/supabase/server'
import RecordPaymentForm from '@/components/forms/RecordPaymentForm'

export default async function FinancesRecordPaymentPage() {
    const supabase = await createClient()

    const { data: members } = await supabase
        .from('members')
        .select('id, member_id, full_name, photo_url, status, membership_plan:membership_plans(id, name, price)')
        .in('status', ['active', 'expired', 'inactive'])
        .order('full_name')

    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name, price, duration_days')
        .eq('is_active', true)
        .order('price')

    return (
        <RecordPaymentForm
            members={members || []}
            plans={plans || []}
        />
    )
}

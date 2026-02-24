import { createClient } from '@/lib/supabase/server'
import ReportsDashboard from '@/components/reports/ReportsDashboard'

export default async function ReportsPage() {
    const supabase = await createClient()

    // Members with plan info
    const { data: members } = await supabase
        .from('members')
        .select('id, full_name, member_id, phone, status, membership_expiry_date, created_at, membership_plan:membership_plans(name)')
        .order('created_at', { ascending: true })

    // All check-ins (last 90 days for performance)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const { data: checkIns } = await supabase
        .from('check_ins')
        .select('member_id, check_in_time')
        .gte('check_in_time', ninetyDaysAgo.toISOString())
        .order('check_in_time', { ascending: true })

    // Payments
    const { data: payments } = await supabase
        .from('payments')
        .select('id, member_id, amount, payment_method, payment_status, payment_date, member:members(full_name, member_id, phone)')
        .order('payment_date', { ascending: false })

    return (
        <ReportsDashboard
            members={members || []}
            checkIns={checkIns || []}
            payments={payments || []}
        />
    )
}

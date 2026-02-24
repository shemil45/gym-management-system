import { createClient } from '@/lib/supabase/server'
import PaymentsTable from '@/components/tables/PaymentsTable'

export default async function PaymentsPage() {
    const supabase = await createClient()

    // Fetch payments with member details, most recent first
    const { data: payments } = await supabase
        .from('payments')
        .select(`
            *,
            member:members(
                id,
                member_id,
                full_name,
                photo_url,
                membership_plan:membership_plans(name)
            )
        `)
        .order('payment_date', { ascending: false })
        .limit(500)

    // Totals for stats
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0]

    const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'paid')
        .eq('payment_date', today)

    const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'paid')
        .gte('payment_date', monthStart)

    const todayTotal = (todayPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
    const monthTotal = (monthPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)

    return (
        <PaymentsTable
            payments={payments || []}
            todayTotal={todayTotal}
            monthTotal={monthTotal}
        />
    )
}

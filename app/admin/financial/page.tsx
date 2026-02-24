import { createClient } from '@/lib/supabase/server'
import FinancialDashboard from '@/components/financial/FinancialDashboard'

export default async function FinancialPage() {
    const supabase = await createClient()

    // Fetch all paid payments (for revenue)
    const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('payment_status', 'paid')
        .order('payment_date', { ascending: true })

    // Fetch all expenses
    const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

    return (
        <FinancialDashboard
            payments={payments || []}
            expenses={expenses || []}
        />
    )
}

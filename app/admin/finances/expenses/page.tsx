import { createClient } from '@/lib/supabase/server'
import ExpenseDashboard from '@/components/financial/ExpenseDashboard'

export default async function FinancesExpensesPage() {
    const supabase = await createClient()

    const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('payment_status', 'paid')
        .order('payment_date', { ascending: true })

    const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

    return (
        <ExpenseDashboard
            payments={payments || []}
            expenses={expenses || []}
        />
    )
}

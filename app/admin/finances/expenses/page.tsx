import { createClient } from '@/lib/supabase/server'
import ExpenseDashboard from '@/components/financial/ExpenseDashboard'

type FinancesExpensesPageProps = {
    searchParams: Promise<{
        category?: string
        date?: string
        type?: string
    }>
}

export default async function FinancesExpensesPage({ searchParams }: FinancesExpensesPageProps) {
    const params = await searchParams
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
            key={`${params.category || 'all'}:${params.date || 'none'}:${params.type || 'none'}`}
            payments={payments || []}
            expenses={expenses || []}
            initialFilters={{
                category: params.category,
                date: params.date,
                type: params.type,
            }}
        />
    )
}

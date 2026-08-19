import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import ExpenseDashboard from '@/components/financial/ExpenseDashboard'

const ITEMS_PER_PAGE = 20

type PaymentRow = {
    amount: number | null
    payment_date: string
}

type ExpenseSummaryRow = {
    amount: number | null
    expense_date: string
    category: 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'
}

type FinancesExpensesPageProps = {
    searchParams: Promise<{
        page?: string
        q?: string
        category?: string
        date?: string
        dateFrom?: string
        dateTo?: string
        type?: string
    }>
}

function getPage(value: string | undefined) {
    const page = Number(value ?? '1')
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

function getPresetDateRange(preset: string | undefined) {
    const today = new Date()
    const todayValue = today.toISOString().split('T')[0]

    if (preset === 'today') {
        return { from: todayValue, to: todayValue }
    }

    if (preset === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        return { from: monthStart, to: todayValue }
    }

    return { from: '', to: '' }
}

export default async function FinancesExpensesPage({ searchParams }: FinancesExpensesPageProps) {
    const params = await searchParams
    const supabase = await createClient()
    const page = getPage(params.page)
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    const query = params.q?.trim() ?? ''
    const category = params.category || 'all'
    const presetDateRange = getPresetDateRange(params.date)
    const dateFrom = params.dateFrom ?? presetDateRange.from
    const dateTo = params.dateTo ?? presetDateRange.to

    const [paymentsResult, summaryExpensesResult] = await Promise.all([
        supabase
            .from('payments')
            .select('amount, payment_date')
            .eq('payment_status', 'paid')
            .order('payment_date', { ascending: true }),
        supabase
            .from('expenses')
            .select('amount, expense_date, category')
            .order('expense_date', { ascending: true }),
    ])
    const { data: paymentRows } = paymentsResult as unknown as QueryResult<PaymentRow[] | null>
    const { data: summaryExpenseRows } = summaryExpensesResult as unknown as QueryResult<ExpenseSummaryRow[] | null>

    let expensesQuery = supabase
        .from('expenses')
        .select('id, category, amount, description, expense_date, created_at', { count: 'exact' })

    if (query) {
        expensesQuery = expensesQuery.ilike('description', `%${query}%`)
    }

    if (category !== 'all') {
        expensesQuery = expensesQuery.eq('category', category)
    }

    if (dateFrom) {
        expensesQuery = expensesQuery.gte('expense_date', dateFrom)
    }

    if (dateTo) {
        expensesQuery = expensesQuery.lte('expense_date', dateTo)
    }

    const { data: expenses, count: totalExpenses } = await expensesQuery
        .order('expense_date', { ascending: false })
        .range(from, to)

    const payments = (paymentRows ?? []).map((payment) => ({
        amount: Number(payment.amount ?? 0),
        payment_date: payment.payment_date,
    }))
    const summaryExpenses = (summaryExpenseRows ?? []).map((expense, index) => ({
        id: `${expense.category}:${expense.expense_date}:${index}`,
        category: expense.category,
        amount: Number(expense.amount ?? 0),
        description: '',
        expense_date: expense.expense_date,
        created_at: expense.expense_date,
    }))

    return (
        <ExpenseDashboard
            key={`${params.page || '1'}:${params.q || ''}:${params.category || 'all'}:${params.date || 'none'}:${dateFrom}:${dateTo}:${params.type || 'none'}`}
            payments={payments || []}
            expenses={expenses || []}
            summaryExpenses={summaryExpenses}
            currentPage={page}
            totalCount={totalExpenses || 0}
            initialFilters={{
                q: params.q,
                category: params.category,
                date: params.date,
                dateFrom,
                dateTo,
                type: params.type,
            }}
        />
    )
}

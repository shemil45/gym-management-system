import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import PaymentsTable from '@/components/tables/PaymentsTable'

type PaymentSummaryRow = {
    amount: number
}

type PaymentTableRow = {
    id: string
    member_id: string
    amount: number
    payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
    payment_status: 'paid' | 'pending' | 'failed' | 'refunded'
    payment_date: string
    invoice_number: string | null
    notes: string | null
    created_at: string
    member: {
        id: string
        member_id: string
        full_name: string
        photo_url: string | null
        membership_start_date: string | null
        membership_expiry_date: string | null
        membership_plan: { name: string } | null
    } | null
}

export default async function FinancesPaymentsPage() {
    const supabase = await createClient()

    const paymentsResult = await supabase
        .from('payments')
        .select(`
            *,
            member:members(
                id,
                member_id,
                full_name,
                photo_url,
                membership_start_date,
                membership_expiry_date,
                membership_plan:membership_plans(name)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(500)
    const { data: payments } = paymentsResult as unknown as QueryResult<PaymentTableRow[] | null>

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0]

    const todayPaymentsResult = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'paid')
        .eq('payment_date', today)
    const { data: todayPayments } = todayPaymentsResult as unknown as QueryResult<PaymentSummaryRow[] | null>

    const monthPaymentsResult = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'paid')
        .gte('payment_date', monthStart)
    const { data: monthPayments } = monthPaymentsResult as unknown as QueryResult<PaymentSummaryRow[] | null>

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

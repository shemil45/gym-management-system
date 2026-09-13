import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getCurrentMemberContext } from '@/lib/auth/member-server'
import type { PaymentRecord } from '@/lib/member/portal-data'

/*
  Paged payment history for the signed-in member.

  Separate from `getMemberPortalData`, whose short `history` window exists for
  the dashboard's "last payment" and must stay cheap. A window is the wrong
  shape for the history screen: once a member had more payments than it held,
  the oldest silently vanished and the year total - summed from the window -
  went *down* as new payments came in. Here the page is a real offset window
  with an exact count, and the year total is its own aggregate over every paid
  row.
*/

export const PAYMENTS_PAGE_SIZE = 20

export interface PaymentHistoryPage {
    rows: PaymentRecord[]
    page: number
    pageCount: number
    total: number
    /** 1-based index of the first row on this page; 0 when empty. */
    from: number
    /** 1-based index of the last row on this page; 0 when empty. */
    to: number
}

type PaymentRow = {
    id: string
    amount: number | null
    payment_date: string
    created_at: string
    payment_method: string | null
    payment_status: string | null
    invoice_number: string | null
    receipt_number: string | null
    membership_start_date: string | null
    membership_end_date: string | null
}

const HISTORY_COLUMNS =
    'id, amount, payment_date, created_at, payment_method, payment_status, invoice_number, receipt_number, membership_start_date, membership_end_date'

export async function getMemberPaymentHistory(requestedPage: number): Promise<PaymentHistoryPage | null> {
    const context = await getCurrentMemberContext()
    if (!context.user || !context.member) return null

    const supabase = await createClient()
    const memberId = context.member.id

    // The count comes back with the first page; the requested page is then
    // clamped so a stale link past the end shows the last page, not nothing.
    const page = Math.max(1, Math.floor(requestedPage) || 1)
    const from = (page - 1) * PAYMENTS_PAGE_SIZE

    const { data, count, error } = await supabase
        .from('payments')
        .select(HISTORY_COLUMNS, { count: 'exact' })
        .eq('member_id', memberId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, from + PAYMENTS_PAGE_SIZE - 1)

    if (error) throw error

    const total = count ?? 0
    const pageCount = Math.max(1, Math.ceil(total / PAYMENTS_PAGE_SIZE))

    if (page > pageCount && total > 0) return getMemberPaymentHistory(pageCount)

    const rows = ((data ?? []) as unknown as PaymentRow[]).map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        date: row.payment_date,
        recordedAt: row.created_at,
        method: row.payment_method ?? 'cash',
        status: row.payment_status ?? 'paid',
        invoiceNumber: row.invoice_number,
        receiptNumber: row.receipt_number,
        periodStart: row.membership_start_date,
        periodEnd: row.membership_end_date,
    }))

    return {
        rows,
        page,
        pageCount,
        total,
        from: rows.length ? from + 1 : 0,
        to: rows.length ? from + rows.length : 0,
    }
}

/** Sum of every paid payment booked in `year`, independent of any page. */
export async function getMemberPaidInYear(year: number): Promise<number> {
    const context = await getCurrentMemberContext()
    if (!context.user || !context.member) return 0

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('member_id', context.member.id)
        .eq('payment_status', 'paid')
        .gte('payment_date', `${year}-01-01`)
        .lt('payment_date', `${year + 1}-01-01`)

    if (error) throw error
    return ((data ?? []) as Array<{ amount: number | null }>).reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0,
    )
}

import { toCsv } from '@/lib/reports/csv'
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from '@/lib/reports/expenses-aggregate'
import type { CategoryReport, LedgerReport, PnlReport } from '@/lib/reports/expenses'

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100)

export function pnlCsv(report: Pick<PnlReport, 'buckets'>): string {
    return toCsv(
        ['Bucket start', 'Period', 'Membership revenue', 'Admission fees', 'Refunds', 'Net income', ...EXPENSE_CATEGORIES.map((c) => CATEGORY_LABELS[c]), 'Total expenses', 'Net', 'Margin %'],
        report.buckets.map((b) => [b.start, b.label, b.membershipRevenue, b.admissionFees, b.refunded, b.netIncome, ...EXPENSE_CATEGORIES.map((c) => b.byCategory[c]), b.totalExpenses, b.net, round2(b.margin)]),
    )
}

/** With comparison off, the two comparison columns are blank rather than zero. */
export function categoryCsv(report: Pick<CategoryReport, 'rows'> & Partial<Pick<CategoryReport, 'compare'>>): string {
    const compared = report.compare !== 'none'
    return toCsv(
        ['Category', 'Entries', 'Total', 'Share %', 'Avg per entry', 'Previous period', 'Change %'],
        report.rows.map((r) => [r.label, r.entries, r.total, round2(r.share), round2(r.avg), compared ? r.previous : null, compared ? round2(r.delta) : null]),
    )
}

export function ledgerCsv(report: Pick<LedgerReport, 'rows'>): string {
    return toCsv(['Date', 'Category', 'Description', 'Amount', 'Added by', 'Receipt URL'], report.rows.map((r) => [r.expense_date, CATEGORY_LABELS[r.category], r.description, r.amount, r.adder_name, r.receipt_url]))
}

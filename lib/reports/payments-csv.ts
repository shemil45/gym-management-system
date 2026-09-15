import { toCsv } from '@/lib/reports/csv'
import { PAYMENT_METHODS, METHOD_LABELS } from '@/lib/reports/payments-aggregate'
import type { DayBookReport, PendingReport, PlanReport, StaffReport, SummaryReport } from '@/lib/reports/payments'

function timeInKolkata(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
}

export function dayBookCsv(report: DayBookReport): string {
    return toCsv(
        ['Date', 'Time', 'Receipt', 'Member', 'Member ID', 'Plan', 'Amount', 'Admission fee', 'Coins used', 'Method', 'Status', 'Collected by', 'Notes'],
        report.rows.map((r) => [
            r.payment_date, timeInKolkata(r.created_at), r.receipt_number ?? r.invoice_number, r.member_name, r.member_code, r.plan_name,
            r.amount, r.admission_fee_amount, r.referral_coins_used, r.payment_method, r.payment_status, r.processor_name, r.notes,
        ]),
    )
}

export function summaryCsv(report: SummaryReport): string {
    return toCsv(
        ['Bucket start', 'Period', 'Txns', 'Collected', ...PAYMENT_METHODS.map((m) => METHOD_LABELS[m]), 'Admission fees', 'Membership revenue', 'Coins redeemed', 'Refunded'],
        report.buckets.map((b) => [
            b.start, b.label, b.txns, b.collected, ...PAYMENT_METHODS.map((m) => b.byMethod[m]),
            b.admissionFees, b.membershipRevenue, b.coinsRedeemed, b.refunded,
        ]),
    )
}

export function planCsv(report: PlanReport): string {
    return toCsv(['Plan', 'Txns', 'Revenue', 'Share %', 'Avg ticket'], report.rows.map((r) => [r.plan, r.txns, r.revenue, r.share, r.avgTicket]))
}

export function pendingCsv(report: PendingReport): string {
    return toCsv(
        ['Date', 'Member', 'Member ID', 'Phone', 'Plan', 'Amount', 'Method', 'Status', 'Notes'],
        report.rows.map((r) => [r.payment_date, r.member_name, r.member_code, r.member_phone, r.plan_name, r.amount, r.payment_method, r.payment_status, r.notes]),
    )
}

export function staffCsv(report: StaffReport): string {
    return toCsv(['Collected by', 'Txns', 'Collected', 'Cash handled'], report.rows.map((r) => [r.staff, r.txns, r.collected, r.cash]))
}

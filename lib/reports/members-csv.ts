import { toCsv, type CsvCell } from '@/lib/reports/csv'
import { STATUS_LABELS, type EffectiveStatus, type LapsedRow, type PaymentStub, type ReportMemberRow } from '@/lib/reports/members-aggregate'
import type { InactiveReport, JoinsReport, RenewalsReport, RetentionReport, RosterReport } from '@/lib/reports/members'

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100)

const SOURCE_LABELS = { referral: 'Referral', 'walk-in': 'Walk-in' } as const

function memberCells(member: ReportMemberRow): CsvCell[] {
    return [member.full_name, member.member_code, member.phone, member.plan_name]
}

function paymentCells(payment: PaymentStub | null): CsvCell[] {
    return [payment?.amount ?? null, payment?.payment_date ?? null]
}

function lapsedRowsCsv(headers: string[], rows: LapsedRow[]): string {
    return toCsv(headers, rows.map((r) => [...memberCells(r.member), r.endedOn, ...paymentCells(r.lastPayment)]))
}

export function joinsCsv(report: JoinsReport): string {
    return toCsv(
        ['Join date', 'Member', 'Member ID', 'Phone', 'Plan', 'Source', 'Referrer', 'First payment', 'First payment date'],
        report.rows.map((r) => [
            r.joinDate, ...memberCells(r.member), SOURCE_LABELS[r.source], r.member.referrer_name, ...paymentCells(r.firstPayment),
        ]),
    )
}

export function renewalsCsv(report: RenewalsReport): string {
    if (report.mode === 'lapsed') {
        return toCsv(
            ['Member', 'Member ID', 'Phone', 'Plan', 'Ended on', 'Overdue days', 'Last payment', 'Last payment date'],
            report.rows.map((r) => [...memberCells(r.member), r.endedOn, r.overdueDays, ...paymentCells(r.lastPayment)]),
        )
    }
    return toCsv(
        ['Member', 'Member ID', 'Phone', 'Plan', 'Expiry', 'Days left', 'Last payment', 'Last payment date'],
        report.rows.map((r) => [...memberCells(r.member), r.expiry, r.daysLeft, ...paymentCells(r.lastPayment)]),
    )
}

export function retentionCsv(report: RetentionReport): string {
    const buckets = toCsv(
        ['Bucket start', 'Period', 'Ended', 'Renewed', 'Retention %', 'Churned'],
        report.buckets.map((b) => [b.start, b.label, b.ended, b.renewed, round2(b.retention), b.churned]),
    )
    const churnedCsv = lapsedRowsCsv(['Member', 'Member ID', 'Phone', 'Plan', 'Ended on', 'Last payment', 'Last payment date'], report.churned)
    return `${buckets}\r\n\r\n${churnedCsv.replace(/^﻿/, '')}`
}

export function rosterCsv(report: RosterReport): string {
    const order: EffectiveStatus[] = ['active', 'expiring', 'expired', 'frozen', 'inactive']
    const statuses = toCsv(
        ['Status', 'Members'],
        [...order.map((status) => [STATUS_LABELS[status], report.counts[status]]), ['Total', report.counts.total]],
    )
    const plans = toCsv(
        ['Plan', 'Members', 'Share %', 'Price', 'Duration days', 'Monthly value'],
        report.plans.map((p) => [p.plan, p.members, round2(p.share), p.price, p.durationDays, round2(p.monthlyValue)]),
    )
    return `${statuses}\r\n\r\n${plans.replace(/^﻿/, '')}`
}

export function inactiveCsv(report: InactiveReport): string {
    const { days } = report
    return toCsv(
        ['Member', 'Member ID', 'Phone', 'Plan', 'Expiry', 'Last visit', 'Days since'],
        report.rows.map((r) => [
            ...memberCells(r.member),
            r.expiry,
            r.lastVisit ?? `No visit in ${days}d`,
            r.daysSince === null ? `${days}+` : r.daysSince,
        ]),
    )
}

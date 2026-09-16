import { toCsv, type CsvCell } from '@/lib/reports/csv'
import type { ByMemberReport, FootfallReport, HeatmapReport } from '@/lib/reports/attendance'

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100)

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

export function footfallCsv(report: FootfallReport): string {
    return toCsv(
        ['Bucket start', 'Period', 'Visits', 'Unique members', 'Days', 'Per day', 'Peak hour', 'Manual', 'QR', 'Kiosk', 'Fingerprint', 'Avg minutes'],
        report.buckets.map((b) => [
            b.start, b.label, b.visits, b.uniqueMembers, b.days, round2(b.perDay), b.peakHour,
            b.byMethod.manual, b.byMethod.qr, b.byMethod.kiosk, b.byMethod.fingerprint, round2(b.avgMinutes),
        ]),
    )
}

export function byMemberCsv(report: ByMemberReport): string {
    return toCsv(
        ['Member', 'Member ID', 'Phone', 'Plan', 'Visits', 'Avg minutes', 'Last visit', 'Days since'],
        report.rows.map((r) => [
            r.member.full_name, r.member.member_code, r.member.phone, r.member.plan_name,
            r.visits, round2(r.avgMinutes), r.lastVisit, r.daysSince,
        ]),
    )
}

export function heatmapCsv(report: HeatmapReport): string {
    const rows: CsvCell[][] = report.hours.map((hour, i) => [
        formatHour(hour), ...report.cells[i], report.rowTotals[i],
    ])
    const grandTotal = report.colTotals.reduce((s, c) => s + c, 0)
    rows.push(['Total', ...report.colTotals, grandTotal])
    return toCsv(['Hour', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total'], rows)
}

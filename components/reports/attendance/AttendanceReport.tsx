import Link from 'next/link'
import ReportTabs from '@/components/reports/ReportTabs'
import { ChevronLeft } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { COMPARISONS } from '@/lib/reports/comparison'
import { ATTENDANCE_TABS, attendanceSearchParams, type AttendanceReportQuery } from '@/lib/reports/attendance-params'
import PrintHeader from '@/components/reports/print/PrintHeader'

type Props = {
    query: AttendanceReportQuery
    /** For the printed masthead. */
    gymName?: string
    controls: React.ReactNode
    children: React.ReactNode
}

export default function AttendanceReport({ query, gymName, controls, children }: Props) {
    const tabLabel = ATTENDANCE_TABS.find((tab) => tab.id === query.tab)?.label ?? 'Attendance'
    const comparisonLabel = COMPARISONS.find((option) => option.id === query.compare)?.label
    const compared = query.tab === 'footfall' && query.previous
    return (
        <div className="space-y-5">
            {gymName && (
                <PrintHeader
                    gymName={gymName}
                    title={`Attendance — ${tabLabel}`}
                    period={`${formatDate(query.range.from, 'dd MMM yyyy')} – ${formatDate(query.range.to, 'dd MMM yyyy')}`}
                    comparison={compared && query.previous ? `${comparisonLabel?.toLowerCase()} (${formatDate(query.previous.from, 'dd MMM yyyy')} – ${formatDate(query.previous.to, 'dd MMM yyyy')})` : undefined}
                />
            )}
            <div className="print:hidden">
                <Link href="/admin/reports" className="inline-flex items-center gap-1 rounded text-xs text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white">
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Reports
                </Link>
                <h1 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Attendance</h1>
            </div>

            <ReportTabs
                ariaLabel="Attendance reports"
                tabs={ATTENDANCE_TABS.map((tab) => ({ id: tab.id, label: tab.label, href: `/admin/reports/attendance?${attendanceSearchParams({ ...query, tab: tab.id }).toString()}` }))}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">{controls}</div>
            {children}
        </div>
    )
}

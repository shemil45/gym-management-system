import Link from 'next/link'
import ReportTabs from '@/components/reports/ReportTabs'
import { ChevronLeft } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { PAYMENTS_TABS, toSearchParams, type PaymentsReportQuery } from '@/lib/reports/payments-params'
import { COMPARISONS } from '@/lib/reports/comparison'
import PrintHeader from '@/components/reports/print/PrintHeader'

type Props = {
    query: PaymentsReportQuery
    /** For the printed masthead. The day book prints its own. */
    gymName?: string
    controls: React.ReactNode
    kpis?: React.ReactNode
    children: React.ReactNode
}

export default function PaymentsReport({ query, gymName, controls, kpis, children }: Props) {
    const tabLabel = PAYMENTS_TABS.find((tab) => tab.id === query.tab)?.label ?? 'Payments'
    const comparisonLabel = COMPARISONS.find((option) => option.id === query.compare)?.label
    return (
        <div className="space-y-5">
            {gymName && query.tab !== 'daybook' && (
                <PrintHeader
                    gymName={gymName}
                    title={`Payments — ${tabLabel}`}
                    period={`${formatDate(query.range.from, 'dd MMM yyyy')} – ${formatDate(query.range.to, 'dd MMM yyyy')}`}
                    comparison={query.previous ? `${comparisonLabel?.toLowerCase()} (${formatDate(query.previous.from, 'dd MMM yyyy')} – ${formatDate(query.previous.to, 'dd MMM yyyy')})` : undefined}
                />
            )}
            <div className="print:hidden">
                <Link href="/admin/reports" className="inline-flex items-center gap-1 rounded text-xs text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white">
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Reports
                </Link>
                <h1 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Payments</h1>
            </div>

            <ReportTabs
                ariaLabel="Payment reports"
                tabs={PAYMENTS_TABS.map((tab) => ({ id: tab.id, label: tab.label, href: `/admin/reports/payments?${toSearchParams({ ...query, tab: tab.id }).toString()}` }))}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">{controls}</div>
            {kpis}
            {children}
        </div>
    )
}

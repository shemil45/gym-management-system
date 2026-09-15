import Link from 'next/link'
import ReportTabs from '@/components/reports/ReportTabs'
import { ChevronLeft } from 'lucide-react'
import { PAYMENTS_TABS, toSearchParams, type PaymentsReportQuery } from '@/lib/reports/payments-params'

type Props = {
    query: PaymentsReportQuery
    controls: React.ReactNode
    kpis?: React.ReactNode
    children: React.ReactNode
}

export default function PaymentsReport({ query, controls, kpis, children }: Props) {
    return (
        <div className="space-y-5">
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

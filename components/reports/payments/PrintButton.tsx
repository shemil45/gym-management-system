'use client'

import { Printer } from 'lucide-react'
import { useReportNavigation } from '@/components/reports/ReportNavigation'

export default function PrintButton() {
    // Disabled while a navigation is in flight: the visible table is still
    // the loading skeleton at that point, and window.print() would capture
    // exactly that — placeholder bars, not the real rows.
    const { isPending } = useReportNavigation()
    return (
        <button
            type="button"
            disabled={isPending}
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-medium text-gray-700 transition-colors hover:enabled:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed print:hidden dark:border-neutral-700 dark:text-neutral-200 dark:hover:enabled:bg-neutral-800 dark:focus-visible:ring-neutral-500"
        >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
        </button>
    )
}

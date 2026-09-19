'use client'

import { Download } from 'lucide-react'
import { useReportNavigation } from '@/components/reports/ReportNavigation'

// Disabled while a navigation is in flight: the href is already correct for
// the new tab/period (it's derived from server-parsed search params, not the
// table's own fetch), but exporting or printing mid-navigation invites a
// double-click, and Print in particular would capture the loading skeleton
// instead of the real table — see PrintButton.
export default function ExportCsvButton({ search, basePath }: { search: string; basePath: string }) {
    const { isPending } = useReportNavigation()
    const href = `${basePath}/export?${search}`
    return (
        <a
            href={href}
            aria-disabled={isPending}
            tabIndex={isPending ? -1 : undefined}
            onClick={(event) => { if (isPending) event.preventDefault() }}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-medium text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:border-neutral-700 dark:text-neutral-200 ${isPending ? 'pointer-events-none opacity-50' : 'hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
        >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
        </a>
    )
}

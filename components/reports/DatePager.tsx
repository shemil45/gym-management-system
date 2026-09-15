'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDaysIso } from '@/lib/reports/dates'
import { toSearchParams, type PaymentsReportQuery } from '@/lib/reports/payments-params'

export default function DatePager({ query, basePath, today }: { query: PaymentsReportQuery; basePath: string; today: string }) {
    const router = useRouter()
    const go = (date: string) => {
        const params = toSearchParams(query)
        params.set('date', date)
        router.push(`${basePath}?${params.toString()}`)
    }
    const button = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="flex items-center gap-1.5">
            <button type="button" className={button} onClick={() => go(addDaysIso(query.date, -1))} aria-label="Previous day">
                <ChevronLeft className="h-4 w-4" />
            </button>
            <input type="date" value={query.date} max={today} onChange={(e) => e.target.value && go(e.target.value)} aria-label="Day"
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
            <button type="button" className={button} onClick={() => go(addDaysIso(query.date, 1))} disabled={query.date >= today} aria-label="Next day">
                <ChevronRight className="h-4 w-4" />
            </button>
            {query.date !== today && (
                <button type="button" onClick={() => go(today)} className="ml-1 inline-flex h-8 items-center rounded-md border border-gray-200 px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Today</button>
            )}
        </div>
    )
}

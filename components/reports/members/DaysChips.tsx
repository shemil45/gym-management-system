'use client'

import { useReportNavigation } from '@/components/reports/ReportNavigation'
import { INACTIVE_DAYS, membersSearchParams, type MembersReportQuery } from '@/lib/reports/members-params'

const BASE = '/admin/reports/members'

export default function DaysChips({ query }: { query: MembersReportQuery }) {
    const { navigate } = useReportNavigation()

    const chip = 'inline-flex items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="No visit in">
            {INACTIVE_DAYS.map((d) => {
                const active = query.days === d
                return (
                    <button key={d} type="button"
                        onClick={() => navigate(`${BASE}?${membersSearchParams({ ...query, days: d }).toString()}`)}
                        className={`${chip} h-7 ${active ? on : off}`} aria-pressed={active}>
                        {d}d
                    </button>
                )
            })}
        </div>
    )
}

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { MEMBERS_TABS, membersSearchParams, type MembersReportQuery } from '@/lib/reports/members-params'

type Props = {
    query: MembersReportQuery
    controls: React.ReactNode
    children: React.ReactNode
}

export default function MembersReport({ query, controls, children }: Props) {
    return (
        <div className="space-y-5">
            <div className="print:hidden">
                <Link href="/admin/reports" className="inline-flex items-center gap-1 rounded text-xs text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white">
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Reports
                </Link>
                <h1 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Members</h1>
            </div>

            <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 print:hidden dark:border-neutral-700" aria-label="Member reports">
                {MEMBERS_TABS.map((tab) => {
                    const params = membersSearchParams({ ...query, tab: tab.id })
                    const active = tab.id === query.tab
                    return (
                        <Link key={tab.id} href={`/admin/reports/members?${params.toString()}`}
                            aria-current={active ? 'page' : undefined}
                            className={`-mb-px whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 ${active ? 'border-gray-900 font-medium text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white'}`}>
                            {tab.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">{controls}</div>
            {children}
        </div>
    )
}

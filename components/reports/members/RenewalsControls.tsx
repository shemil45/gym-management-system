'use client'

import { useRouter } from 'next/navigation'
import { HORIZONS, membersSearchParams, type MembersReportQuery } from '@/lib/reports/members-params'

const BASE = '/admin/reports/members'

export default function RenewalsControls({ query }: { query: MembersReportQuery }) {
    const router = useRouter()

    const go = (patch: Partial<Pick<MembersReportQuery, 'horizon' | 'lapsed'>>) => {
        const next = { ...query, ...patch }
        router.push(`${BASE}?${membersSearchParams(next).toString()}`)
    }

    const chip = 'inline-flex items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Renewal horizon">
                {HORIZONS.map((h) => {
                    const active = !query.lapsed && query.horizon === h
                    return (
                        <button key={h} type="button" onClick={() => go({ horizon: h, lapsed: false })}
                            className={`${chip} h-7 ${active ? on : off}`} aria-pressed={active}>
                            {h}d
                        </button>
                    )
                })}
            </div>
            <button type="button" onClick={() => go({ lapsed: !query.lapsed })}
                className={`${chip} h-7 border ${query.lapsed ? `${on} border-gray-900 dark:border-white` : `${off} border-gray-200 dark:border-neutral-700`}`}
                aria-pressed={query.lapsed}>
                Lapsed in period
            </button>
        </div>
    )
}

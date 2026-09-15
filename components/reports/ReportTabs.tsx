'use client'

import Link from 'next/link'
import { useReportNavigation } from '@/components/reports/ReportNavigation'

type Tab = { id: string; label: string; href: string }

// Tab bar shared by every report area. Real links (middle-click, a11y, no-JS)
// that route through the navigation provider on a plain click so the body
// shows the target tab's skeleton immediately.
export default function ReportTabs({ tabs, ariaLabel }: { tabs: Tab[]; ariaLabel: string }) {
    const { activeTab, pendingTab, isPending, navigate } = useReportNavigation()
    const highlighted = isPending && pendingTab ? pendingTab : activeTab

    return (
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 print:hidden dark:border-neutral-700" aria-label={ariaLabel}>
            {tabs.map((tab) => {
                const active = tab.id === highlighted
                return (
                    <Link
                        key={tab.id}
                        href={tab.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                            event.preventDefault()
                            if (tab.id !== activeTab || !isPending) navigate(tab.href, tab.id)
                        }}
                        className={`-mb-px whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 ${active ? 'border-gray-900 font-medium text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white'}`}
                    >
                        {tab.label}
                    </Link>
                )
            })}
        </nav>
    )
}

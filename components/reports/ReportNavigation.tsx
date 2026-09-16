'use client'

import { createContext, useCallback, useContext, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AttendanceTabSkeleton, ExpensesTabSkeleton, MembersTabSkeleton, PaymentsTabSkeleton } from '@/components/reports/ReportSkeleton'

// Instant feedback for in-report navigation. A tab click or control change
// is a React transition: the server keeps the old tree on screen until the
// new payload arrives, which on a cold function can be seconds of nothing.
// Routing every navigation through this provider lets the body swap to the
// target tab's skeleton on click, before the server has replied.

export type ReportArea = 'payments' | 'expenses' | 'members' | 'attendance'

type Navigation = {
    area: ReportArea
    activeTab: string
    isPending: boolean
    pendingTab: string | null
    /** Push `href`; `tab` names the tab whose skeleton to show meanwhile (defaults to the active tab). */
    navigate: (href: string, tab?: string) => void
}

const ReportNavigationContext = createContext<Navigation | null>(null)

export function ReportNavigationProvider({ area, activeTab, children }: { area: ReportArea; activeTab: string; children: React.ReactNode }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [pendingTab, setPendingTab] = useState<string | null>(null)

    const navigate = useCallback((href: string, tab?: string) => {
        setPendingTab(tab ?? activeTab)
        startTransition(() => router.push(href))
    }, [router, activeTab])

    return (
        <ReportNavigationContext.Provider value={{ area, activeTab, isPending, pendingTab, navigate }}>
            {children}
        </ReportNavigationContext.Provider>
    )
}

export function useReportNavigation(): Navigation {
    const ctx = useContext(ReportNavigationContext)
    if (!ctx) throw new Error('useReportNavigation must be used inside ReportNavigationProvider')
    return ctx
}

function skeletonFor(area: ReportArea, tab: string) {
    switch (area) {
        case 'payments': return <PaymentsTabSkeleton tab={tab as Parameters<typeof PaymentsTabSkeleton>[0]['tab']} />
        case 'expenses': return <ExpensesTabSkeleton tab={tab as Parameters<typeof ExpensesTabSkeleton>[0]['tab']} />
        case 'members': return <MembersTabSkeleton tab={tab as Parameters<typeof MembersTabSkeleton>[0]['tab']} />
        case 'attendance': return <AttendanceTabSkeleton tab={tab as Parameters<typeof AttendanceTabSkeleton>[0]['tab']} />
    }
}

/** Renders the current tab body, or the pending tab's skeleton while a navigation is in flight. */
export function ReportBody({ children }: { children: React.ReactNode }) {
    const { area, isPending, pendingTab, activeTab } = useReportNavigation()
    if (isPending) {
        return (
            <div className="space-y-5 animate-pulse" aria-busy="true">
                {skeletonFor(area, pendingTab ?? activeTab)}
            </div>
        )
    }
    return <>{children}</>
}

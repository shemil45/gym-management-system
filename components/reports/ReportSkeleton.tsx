// Skeletons for the reports section. Used by the route-level loading.tsx
// files (first navigation) and as Suspense fallbacks inside the payments page
// (tab / period switches), so both paths show the same shapes.

const bone = 'rounded bg-gray-200 dark:bg-neutral-800'

/**
 * Loading state for any chart in the reports area. Used by ChartFrame so a
 * chart waiting on data looks like every other loading surface here rather
 * than introducing a second loading design.
 */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
    // Fixed heights rather than random ones: a skeleton that changes shape
    // between renders reads as content loading twice.
    const bars = [52, 74, 38, 88, 61, 96, 44, 70, 83, 57, 92, 66]
    return (
        <div className="flex animate-pulse items-end gap-2" style={{ height }} aria-hidden="true">
            {bars.map((percent, index) => (
                <div key={index} className={`flex-1 ${bone}`} style={{ height: `${percent}%` }} />
            ))}
        </div>
    )
}

/** A chart inside its card, for tab bodies that lead with one. */
export function ChartCardSkeleton({ height = 260 }: { height?: number }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900" aria-hidden="true">
            <div className={`mb-3 h-4 w-32 ${bone}`} />
            <ChartSkeleton height={height} />
        </div>
    )
}

const KPI_COLUMNS: Record<number, string> = {
    2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-3 lg:grid-cols-5', 6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

export function KpiStripSkeleton({ columns = 3 }: { columns?: 2 | 3 | 4 | 5 | 6 }) {
    return (
        <div className={`grid gap-3 ${KPI_COLUMNS[columns]}`} aria-hidden="true">
            {Array.from({ length: columns }, (_, i) => i).map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className={`h-3 w-20 ${bone}`} />
                    <div className={`mt-2 h-6 w-28 ${bone}`} />
                    <div className={`mt-2 h-3 w-16 ${bone}`} />
                </div>
            ))}
        </div>
    )
}

export function TableSkeleton({ columns = 6, rows = 8, footer = true }: { columns?: number; rows?: number; footer?: boolean }) {
    const cells = Array.from({ length: columns })
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900" aria-hidden="true">
            <div className="grid gap-3 border-b border-gray-200 bg-gray-50/60 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/40" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {cells.map((_, i) => <div key={i} className={`h-2.5 w-3/5 ${bone}`} />)}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="grid gap-3 px-3 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                        {cells.map((_, c) => <div key={c} className={`h-3.5 ${bone} ${c === 0 ? 'w-4/5' : c % 3 === 0 ? 'w-1/2' : 'w-2/3'}`} />)}
                    </div>
                ))}
            </div>
            {footer && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/60 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-800/40">
                    <div className={`h-3 w-24 ${bone}`} />
                    <div className={`h-5 w-28 ${bone}`} />
                </div>
            )}
        </div>
    )
}

/** What the payments page shows while a tab's data streams in. */
export function PaymentsTabSkeleton({ tab }: { tab: 'daybook' | 'summary' | 'plans' | 'pending' | 'staff' }) {
    switch (tab) {
        case 'daybook': return <TableSkeleton columns={11} rows={8} />
        case 'summary': return <><KpiStripSkeleton columns={6} /><ChartCardSkeleton height={280} /><div className="grid gap-4 lg:grid-cols-2"><ChartCardSkeleton height={200} /><ChartCardSkeleton height={200} /></div><TableSkeleton columns={12} rows={7} /></>
        case 'plans': return <><KpiStripSkeleton /><ChartCardSkeleton height={200} /><TableSkeleton columns={5} rows={4} /></>
        case 'pending': return <><KpiStripSkeleton /><ChartCardSkeleton height={180} /><TableSkeleton columns={9} rows={4} /><TableSkeleton columns={9} rows={3} /></>
        case 'staff': return <><KpiStripSkeleton columns={4} /><div className="grid gap-4 lg:grid-cols-2"><ChartCardSkeleton height={200} /><ChartCardSkeleton height={200} /></div><TableSkeleton columns={4} rows={4} /></>
    }
}

/** Shell of the payments report: back link, title, tab bar, controls row. */
export function PaymentsShellSkeleton() {
    return (
        <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading payments report">
            <div>
                <div className={`h-3 w-16 ${bone}`} />
                <div className={`mt-2 h-6 w-28 ${bone}`} />
            </div>
            <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-700">
                {['w-16', 'w-16', 'w-14', 'w-14', 'w-14'].map((w, i) => <div key={i} className={`mx-3 mb-2 h-4 ${w} ${bone}`} />)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`h-8 w-64 ${bone}`} />
                <div className={`h-8 w-28 ${bone}`} />
            </div>
            <PaymentsTabSkeleton tab="daybook" />
        </div>
    )
}

/** What the expenses page shows while a tab's data streams in. */
export function ExpensesTabSkeleton({ tab }: { tab: 'pnl' | 'categories' | 'ledger' }) {
    switch (tab) {
        case 'pnl': return <><KpiStripSkeleton columns={5} /><ChartCardSkeleton height={280} /><ChartCardSkeleton height={200} /><TableSkeleton columns={15} rows={6} /></>
        case 'categories': return <><KpiStripSkeleton /><ChartCardSkeleton height={200} /><TableSkeleton columns={7} rows={5} /></>
        case 'ledger': return <TableSkeleton columns={6} rows={8} />
    }
}

/** Shell of the expenses report: back link, title, tab bar, controls row. */
export function ExpensesShellSkeleton() {
    return (
        <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading expenses report">
            <div>
                <div className={`h-3 w-16 ${bone}`} />
                <div className={`mt-2 h-6 w-32 ${bone}`} />
            </div>
            <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-700">
                {['w-24', 'w-20', 'w-14'].map((w, i) => <div key={i} className={`mx-3 mb-2 h-4 ${w} ${bone}`} />)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`h-8 w-64 ${bone}`} />
                <div className={`h-8 w-28 ${bone}`} />
            </div>
            <ExpensesTabSkeleton tab="pnl" />
        </div>
    )
}

function RosterCardsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className={`h-3 w-14 ${bone}`} />
                    <div className={`mt-2 h-6 w-10 ${bone}`} />
                </div>
            ))}
        </div>
    )
}

/** What the members page shows while a tab's data streams in. */
export function MembersTabSkeleton({ tab }: { tab: 'joins' | 'renewals' | 'retention' | 'roster' | 'inactive' }) {
    switch (tab) {
        case 'joins': return <TableSkeleton columns={6} rows={8} />
        case 'renewals': return <TableSkeleton columns={6} rows={8} />
        case 'retention': return <><KpiStripSkeleton /><TableSkeleton columns={5} rows={4} /><TableSkeleton columns={5} rows={5} /></>
        case 'roster': return <><RosterCardsSkeleton /><TableSkeleton columns={6} rows={4} /></>
        case 'inactive': return <TableSkeleton columns={6} rows={8} />
    }
}

/** Shell of the members report: back link, title, tab bar, controls row. */
export function MembersShellSkeleton() {
    return (
        <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading members report">
            <div>
                <div className={`h-3 w-16 ${bone}`} />
                <div className={`mt-2 h-6 w-24 ${bone}`} />
            </div>
            <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-700">
                {['w-20', 'w-24', 'w-20', 'w-16', 'w-16'].map((w, i) => <div key={i} className={`mx-3 mb-2 h-4 ${w} ${bone}`} />)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`h-8 w-64 ${bone}`} />
                <div className={`h-8 w-28 ${bone}`} />
            </div>
            <MembersTabSkeleton tab="joins" />
        </div>
    )
}

/** What the attendance page shows while a tab's data streams in. */
export function AttendanceTabSkeleton({ tab }: { tab: 'footfall' | 'members' | 'heatmap' }) {
    switch (tab) {
        case 'footfall': return <><KpiStripSkeleton /><TableSkeleton columns={10} rows={6} footer={false} /></>
        case 'members': return <TableSkeleton columns={7} rows={8} />
        case 'heatmap': return <TableSkeleton columns={9} rows={8} footer={false} />
    }
}

/** Shell of the attendance report: back link, title, tab bar, controls row. */
export function AttendanceShellSkeleton() {
    return (
        <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading attendance report">
            <div>
                <div className={`h-3 w-16 ${bone}`} />
                <div className={`mt-2 h-6 w-28 ${bone}`} />
            </div>
            <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-700">
                {['w-16', 'w-20', 'w-20'].map((w, i) => <div key={i} className={`mx-3 mb-2 h-4 ${w} ${bone}`} />)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`h-8 w-64 ${bone}`} />
                <div className={`h-8 w-28 ${bone}`} />
            </div>
            <AttendanceTabSkeleton tab="footfall" />
        </div>
    )
}

function ReferralsKpiStripSkeleton() {
    return (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className={`h-3 w-20 ${bone}`} />
                    <div className={`mt-2 h-6 w-28 ${bone}`} />
                    <div className={`mt-2 h-3 w-16 ${bone}`} />
                </div>
            ))}
        </div>
    )
}

/** What the referrals page shows while a tab's data streams in. */
export function ReferralsTabSkeleton({ tab }: { tab: 'overview' | 'leaderboard' | 'list' }) {
    switch (tab) {
        case 'overview': return <><ReferralsKpiStripSkeleton /><TableSkeleton columns={9} rows={6} /></>
        case 'leaderboard': return <TableSkeleton columns={8} rows={8} />
        case 'list': return <TableSkeleton columns={7} rows={8} />
    }
}

/** Shell of the referrals report: back link, title, tab bar, controls row. */
export function ReferralsShellSkeleton() {
    return (
        <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading referrals report">
            <div>
                <div className={`h-3 w-16 ${bone}`} />
                <div className={`mt-2 h-6 w-24 ${bone}`} />
            </div>
            <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-700">
                {['w-16', 'w-20', 'w-16'].map((w, i) => <div key={i} className={`mx-3 mb-2 h-4 ${w} ${bone}`} />)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`h-8 w-64 ${bone}`} />
                <div className={`h-8 w-28 ${bone}`} />
            </div>
            <ReferralsTabSkeleton tab="overview" />
        </div>
    )
}

/** Shell of the reports landing: heading + five area cards. */
export function ReportsLandingSkeleton() {
    return (
        <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading reports">
            <div className="flex items-center gap-3">
                <div className={`h-5 w-5 ${bone}`} />
                <div>
                    <div className={`h-5 w-24 ${bone}`} />
                    <div className={`mt-2 h-3 w-64 ${bone}`} />
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="flex items-start justify-between">
                            <div className={`h-9 w-9 rounded-lg ${bone}`} />
                            <div className={`mt-1 h-4 w-4 ${bone}`} />
                        </div>
                        <div className={`mt-4 h-4 w-28 ${bone}`} />
                        <div className={`mt-2.5 h-3 w-full ${bone}`} />
                        <div className={`mt-1.5 h-3 w-4/5 ${bone}`} />
                        <div className={`mt-6 h-3 w-24 ${bone}`} />
                    </div>
                ))}
            </div>
        </div>
    )
}

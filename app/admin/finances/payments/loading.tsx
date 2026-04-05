function StatCardSkeleton() {
    return <div className="h-28 rounded-3xl bg-slate-200" />
}

function TableRowSkeleton() {
    return (
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 rounded-2xl bg-slate-100 px-4 py-4">
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
        </div>
    )
}

export default function FinancesPaymentsLoading() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 rounded-lg bg-slate-200" />
                    <div className="h-4 w-72 rounded-lg bg-slate-200" />
                </div>
                <div className="h-11 w-36 rounded-2xl bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
                <div className="space-y-4 border-b border-slate-100 p-5">
                    <div className="h-6 w-40 rounded bg-slate-200" />
                    <div className="flex gap-3">
                        <div className="h-11 flex-1 rounded-2xl bg-slate-200" />
                        <div className="h-11 w-36 rounded-2xl bg-slate-200" />
                    </div>
                </div>
                <div className="space-y-3 p-5">
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                </div>
            </div>
        </div>
    )
}

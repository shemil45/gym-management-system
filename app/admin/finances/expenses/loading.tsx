function ExpenseCardSkeleton() {
    return <div className="h-28 rounded-[1.75rem] bg-slate-200" />
}

function ExpenseRowSkeleton() {
    return (
        <div className="grid grid-cols-[1fr_1.4fr_0.8fr_0.8fr] gap-4 rounded-2xl bg-slate-100 px-4 py-4">
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
        </div>
    )
}

export default function FinancesExpensesLoading() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-52 rounded-lg bg-slate-200" />
                    <div className="h-4 w-80 rounded-lg bg-slate-200" />
                </div>
                <div className="h-11 w-36 rounded-2xl bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ExpenseCardSkeleton />
                <ExpenseCardSkeleton />
                <ExpenseCardSkeleton />
                <ExpenseCardSkeleton />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
                <div className="h-80 rounded-[1.75rem] bg-slate-200" />
                <div className="h-80 rounded-[1.75rem] bg-slate-200" />
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
                <div className="space-y-4 border-b border-slate-100 p-5">
                    <div className="h-6 w-44 rounded bg-slate-200" />
                    <div className="flex gap-3">
                        <div className="h-11 flex-1 rounded-2xl bg-slate-200" />
                        <div className="h-11 w-36 rounded-2xl bg-slate-200" />
                    </div>
                </div>
                <div className="space-y-3 p-5">
                    <ExpenseRowSkeleton />
                    <ExpenseRowSkeleton />
                    <ExpenseRowSkeleton />
                    <ExpenseRowSkeleton />
                </div>
            </div>
        </div>
    )
}

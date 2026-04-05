export default function FinancesRecordPaymentLoading() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="space-y-2">
                <div className="h-8 w-56 rounded-lg bg-slate-200" />
                <div className="h-4 w-80 rounded-lg bg-slate-200" />
            </div>

            <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div className="space-y-3">
                        <div className="h-4 w-28 rounded bg-slate-200" />
                        <div className="h-12 rounded-2xl bg-slate-200" />
                    </div>
                    <div className="space-y-3">
                        <div className="h-4 w-28 rounded bg-slate-200" />
                        <div className="h-12 rounded-2xl bg-slate-200" />
                    </div>
                    <div className="space-y-3">
                        <div className="h-4 w-24 rounded bg-slate-200" />
                        <div className="h-12 rounded-2xl bg-slate-200" />
                    </div>
                    <div className="space-y-3">
                        <div className="h-4 w-24 rounded bg-slate-200" />
                        <div className="h-12 rounded-2xl bg-slate-200" />
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <div className="h-4 w-20 rounded bg-slate-200" />
                    <div className="h-28 rounded-2xl bg-slate-200" />
                </div>

                <div className="mt-6 flex justify-end">
                    <div className="h-11 w-40 rounded-2xl bg-slate-200" />
                </div>
            </div>
        </div>
    )
}

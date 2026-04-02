export default function AddMemberLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-8 w-56 rounded bg-slate-200" />
                <div className="h-4 w-72 rounded bg-slate-200" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-slate-200" />
                        <div className="space-y-2">
                            <div className="h-4 w-32 rounded bg-slate-200" />
                            <div className="h-4 w-40 rounded bg-slate-200" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="h-14 rounded-lg bg-slate-200" />
                        <div className="h-14 rounded-lg bg-slate-200" />
                        <div className="h-14 rounded-lg bg-slate-200" />
                        <div className="h-14 rounded-lg bg-slate-200" />
                        <div className="h-24 rounded-lg bg-slate-200 md:col-span-2" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="h-14 rounded-lg bg-slate-200" />
                        <div className="h-14 rounded-lg bg-slate-200" />
                    </div>

                    <div className="space-y-4 border-t border-slate-200 pt-5">
                        <div className="h-5 w-40 rounded bg-slate-200" />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="h-14 rounded-lg bg-slate-200" />
                            <div className="h-14 rounded-lg bg-slate-200" />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="h-10 w-24 rounded-md bg-slate-200" />
                        <div className="h-10 w-32 rounded-md bg-slate-200" />
                    </div>
                </div>
            </div>
        </div>
    )
}

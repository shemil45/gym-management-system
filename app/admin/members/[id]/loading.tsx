export default function MemberDetailLoading() {
    return (
        <div className="min-h-screen animate-pulse space-y-5 p-4 sm:p-6">
            {/* Back button skeleton */}
            <div className="h-8 w-24 rounded-xl bg-slate-200" />

            {/* Header card */}
            <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="h-16 w-16 shrink-0 rounded-full bg-slate-200" />

                    <div className="flex-1 space-y-2">
                        {/* Name */}
                        <div className="h-6 w-40 rounded-lg bg-slate-200" />
                        {/* Member ID */}
                        <div className="h-4 w-24 rounded-lg bg-slate-100" />
                        {/* Status badge */}
                        <div className="h-5 w-16 rounded-full bg-slate-200" />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <div className="h-9 w-20 rounded-xl bg-slate-200" />
                        <div className="h-9 w-20 rounded-xl bg-slate-200" />
                    </div>
                </div>
            </div>

            {/* Info grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-100"
                    >
                        <div className="mb-2 h-3 w-20 rounded-md bg-slate-100" />
                        <div className="h-5 w-32 rounded-lg bg-slate-200" />
                    </div>
                ))}
            </div>

            {/* Payments / history card */}
            <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
                <div className="mb-4 h-5 w-32 rounded-lg bg-slate-200" />
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                            <div className="space-y-1.5">
                                <div className="h-4 w-36 rounded-md bg-slate-200" />
                                <div className="h-3 w-24 rounded-md bg-slate-100" />
                            </div>
                            <div className="h-4 w-16 rounded-md bg-slate-200" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

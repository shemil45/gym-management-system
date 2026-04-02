export default function AdminLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-56 rounded-lg bg-slate-200" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="h-28 rounded-xl bg-slate-200" />
                <div className="h-28 rounded-xl bg-slate-200" />
                <div className="h-28 rounded-xl bg-slate-200" />
                <div className="h-28 rounded-xl bg-slate-200" />
            </div>
            <div className="h-72 rounded-xl bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="h-80 rounded-xl bg-slate-200 lg:col-span-2" />
                <div className="h-80 rounded-xl bg-slate-200" />
            </div>
        </div>
    )
}

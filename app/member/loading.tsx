export default function MemberLoading() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 w-48 rounded-lg bg-slate-200" />
            <div className="h-24 rounded-2xl bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="h-64 rounded-2xl bg-slate-200" />
                <div className="h-64 rounded-2xl bg-slate-200" />
                <div className="h-64 rounded-2xl bg-slate-200" />
            </div>
        </div>
    )
}

export default function AuthRedirectLoading() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-4 animate-pulse">
                <div className="mx-auto h-10 w-10 rounded-full bg-slate-200" />
                <div className="mx-auto h-5 w-40 rounded bg-slate-200" />
                <div className="mx-auto h-4 w-56 rounded bg-slate-200" />
            </div>
        </div>
    )
}

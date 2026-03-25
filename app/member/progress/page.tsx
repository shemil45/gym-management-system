export default function ProgressPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Progress Tracker</h1>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">Log your weight, reps, and workout completions. View trends and weekly summaries. Coming soon!</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">🚀 Coming Soon</span>
        </div>
    )
}

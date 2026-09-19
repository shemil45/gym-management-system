'use client'

export default function ReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <p className="font-semibold">This report could not be loaded.</p>
            <p className="mt-1 text-rose-700/80 dark:text-rose-300/80">{error.digest ? `Reference ${error.digest}` : 'Please try again.'}</p>
            <button type="button" onClick={reset} className="mt-3 rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/40">Retry</button>
        </div>
    )
}

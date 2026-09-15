import { Lock } from 'lucide-react'

export default function ReportsLocked({ gymName }: { gymName: string }) {
    return (
        <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="rounded-lg bg-gray-100 p-2 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white">Advanced reports are not included in your plan</h1>
                    <p className="text-sm text-pretty text-gray-600 dark:text-neutral-400">
                        Day books, period summaries, plan and staff breakdowns and CSV exports for {gymName} are available on plans that include advanced reports. Contact the platform team to enable them.
                    </p>
                </div>
            </div>
        </div>
    )
}

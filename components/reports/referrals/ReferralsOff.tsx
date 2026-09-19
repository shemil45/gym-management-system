import { Gift } from 'lucide-react'

export default function ReferralsOff() {
    return (
        <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="rounded-lg bg-gray-100 p-2 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <Gift className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white">Referrals aren&apos;t enabled for this gym</h1>
                    <p className="text-sm text-pretty text-gray-600 dark:text-neutral-400">
                        Turn on referrals in the platform portal to track them here.
                    </p>
                </div>
            </div>
        </div>
    )
}

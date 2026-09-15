'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
    return (
        <button type="button" onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 print:hidden dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
        </button>
    )
}

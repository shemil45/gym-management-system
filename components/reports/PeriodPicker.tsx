'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { PeriodQuery } from '@/lib/reports/period-params'
import type { Preset } from '@/lib/reports/dates'

const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This month' },
    { id: 'year', label: 'This year' },
]

export default function PeriodPicker({ query, basePath }: { query: PeriodQuery; basePath: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [from, setFrom] = useState(query.range.from)
    const [to, setTo] = useState(query.range.to)

    // Start from the current URL so keys other areas add (horizon, lapsed,
    // days, …) survive a period change instead of being dropped.
    const go = (patch: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('from')
        params.delete('to')
        for (const [key, value] of Object.entries(patch)) params.set(key, value)
        router.push(`${basePath}?${params.toString()}`)
    }

    const chip = 'inline-flex items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Period">
                {PRESETS.map((preset) => (
                    <button key={preset.id} type="button" onClick={() => go({ preset: preset.id })}
                        className={`${chip} h-7 ${query.preset === preset.id ? on : off}`} aria-pressed={query.preset === preset.id}>
                        {preset.label}
                    </button>
                ))}
            </div>
            <form
                className="flex items-center gap-1.5"
                onSubmit={(event) => { event.preventDefault(); if (from && to && from <= to) go({ preset: 'custom', from, to }) }}
            >
                <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From"
                    className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                <span className="text-xs text-gray-400 dark:text-neutral-500">to</span>
                <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To"
                    className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                <button type="submit" className={`${chip} h-8 border ${query.preset === 'custom' ? `${on} border-gray-900 dark:border-white` : `${off} border-gray-200 dark:border-neutral-700`}`}>Apply</button>
            </form>
        </div>
    )
}

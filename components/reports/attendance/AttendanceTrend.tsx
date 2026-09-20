'use client'

import { useState } from 'react'
import TrendChart from '@/components/reports/charts/TrendChart'
import type { FootfallBucket } from '@/lib/reports/attendance-aggregate'
import type { Comparison } from '@/lib/reports/comparison'

type Metric = 'visits' | 'uniqueMembers' | 'perDay'

const METRICS: { id: Metric; label: string }[] = [
    { id: 'visits', label: 'Visits' },
    { id: 'uniqueMembers', label: 'Unique members' },
    { id: 'perDay', label: 'Visits / day' },
]

const COMPARISON_LABEL: Record<Comparison, string> = { none: '', previous: 'Previous period', 'last-year': 'Last year' }

type Props = {
    buckets: FootfallBucket[]
    /** Comparison period bucketed the same way, aligned by position, or null. */
    comparisonBuckets: FootfallBucket[] | null
    compare: Comparison
}

/**
 * Attendance over the selected period, from the same `footfallBuckets()` the
 * table below renders; the toggle only chooses which field to plot.
 */
export default function AttendanceTrend({ buckets, comparisonBuckets, compare }: Props) {
    const [metric, setMetric] = useState<Metric>('visits')
    const active = METRICS.find((m) => m.id === metric) ?? METRICS[0]

    const chip = 'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="space-y-2">
            <div className="flex justify-end print:hidden">
                <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Trend metric">
                    {METRICS.map((m) => (
                        <button key={m.id} type="button" onClick={() => setMetric(m.id)} aria-pressed={metric === m.id} className={`${chip} ${metric === m.id ? on : off}`}>{m.label}</button>
                    ))}
                </div>
            </div>
            <TrendChart
                title={`${active.label} trend`}
                subtitle={comparisonBuckets ? `Dashed line: ${COMPARISON_LABEL[compare].toLowerCase()}, aligned bucket by bucket` : undefined}
                data={buckets.map((b, i) => ({ label: b.label, current: b[metric], comparison: comparisonBuckets?.[i]?.[metric] ?? null }))}
                xKey="label"
                series={[
                    { key: 'current', label: 'This period' },
                    ...(comparisonBuckets ? [{ key: 'comparison', label: COMPARISON_LABEL[compare], comparison: true }] : []),
                ]}
                format="number"
                height={260}
                emptyMessage="No visits in this period"
            />
        </div>
    )
}

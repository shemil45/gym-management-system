'use client'

import { useState } from 'react'
import TrendChart from '@/components/reports/charts/TrendChart'
import type { SummaryBucket } from '@/lib/reports/payments-aggregate'
import type { Comparison } from '@/lib/reports/comparison'
import type { ValueFormat } from '@/lib/reports/chart-format'

type Metric = 'collected' | 'txns' | 'avgTicket'

const METRICS: { id: Metric; label: string; format: ValueFormat }[] = [
    { id: 'collected', label: 'Revenue', format: 'currency' },
    { id: 'txns', label: 'Transactions', format: 'number' },
    { id: 'avgTicket', label: 'Avg ticket', format: 'currency' },
]

const COMPARISON_LABEL: Record<Comparison, string> = {
    none: '',
    previous: 'Previous period',
    'last-year': 'Last year',
}

function metricOf(bucket: SummaryBucket, metric: Metric): number {
    if (metric === 'avgTicket') return bucket.txns ? bucket.collected / bucket.txns : 0
    return bucket[metric]
}

type Props = {
    buckets: SummaryBucket[]
    /** Comparison period, bucketed the same way, or null. Aligned to the
     *  current period by position: bucket i is compared with bucket i. */
    comparisonBuckets: SummaryBucket[] | null
    compare: Comparison
}

/**
 * The Summary tab's headline chart. Reads the very same `summarise()` buckets
 * the table below it renders, so the two agree to the rupee; the metric toggle
 * only chooses which field of each bucket to plot.
 */
export default function RevenueTrend({ buckets, comparisonBuckets, compare }: Props) {
    const [metric, setMetric] = useState<Metric>('collected')
    const active = METRICS.find((m) => m.id === metric) ?? METRICS[0]

    const data = buckets.map((bucket, index) => ({
        label: bucket.label,
        current: metricOf(bucket, metric),
        comparison: comparisonBuckets?.[index] ? metricOf(comparisonBuckets[index], metric) : null,
    }))

    const series = [
        { key: 'current', label: 'This period' },
        ...(comparisonBuckets ? [{ key: 'comparison', label: COMPARISON_LABEL[compare], comparison: true }] : []),
    ]

    const chip = 'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="space-y-2">
            <div className="flex justify-end print:hidden">
                <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Trend metric">
                    {METRICS.map((m) => (
                        <button key={m.id} type="button" onClick={() => setMetric(m.id)} aria-pressed={metric === m.id} className={`${chip} ${metric === m.id ? on : off}`}>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>
            <TrendChart
                title={`${active.label} trend`}
                subtitle={comparisonBuckets ? `Dashed line: ${COMPARISON_LABEL[compare].toLowerCase()}, aligned bucket by bucket` : undefined}
                data={data}
                xKey="label"
                series={series}
                format={active.format}
                height={280}
                emptyMessage="No payments in this period"
            />
        </div>
    )
}

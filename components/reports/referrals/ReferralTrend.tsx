'use client'

import { useState } from 'react'
import TrendChart from '@/components/reports/charts/TrendChart'
import type { OverviewBucket } from '@/lib/reports/referrals-aggregate'
import type { Comparison } from '@/lib/reports/comparison'
import type { ValueFormat } from '@/lib/reports/chart-format'

type Metric = 'created' | 'converted' | 'conversion'

const METRICS: { id: Metric; label: string; format: ValueFormat }[] = [
    { id: 'created', label: 'Referrals', format: 'number' },
    { id: 'converted', label: 'Conversions', format: 'number' },
    { id: 'conversion', label: 'Conversion rate', format: 'percent' },
]

const COMPARISON_LABEL: Record<Comparison, string> = { none: '', previous: 'Previous period', 'last-year': 'Last year' }

type Props = {
    buckets: OverviewBucket[]
    /** Comparison period bucketed the same way, aligned by position, or null. */
    comparisonBuckets: OverviewBucket[] | null
    compare: Comparison
}

/**
 * Referral activity over the selected period, from the same
 * `overviewBuckets()` the table below renders. Conversion rate per bucket is
 * the bucket's own converted ÷ created, null where nothing was created, so a
 * quiet week is a gap in the line rather than a zero.
 */
export default function ReferralTrend({ buckets, comparisonBuckets, compare }: Props) {
    const [metric, setMetric] = useState<Metric>('created')
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
                format={active.format}
                height={260}
                emptyMessage="No referral activity in this period"
            />
        </div>
    )
}

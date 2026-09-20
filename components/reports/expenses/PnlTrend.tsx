'use client'

import { useState } from 'react'
import TrendChart from '@/components/reports/charts/TrendChart'
import type { PnlBucket } from '@/lib/reports/expenses-aggregate'
import type { Comparison } from '@/lib/reports/comparison'

type View = 'overview' | 'netIncome' | 'totalExpenses' | 'net'

const VIEWS: { id: View; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'netIncome', label: 'Revenue' },
    { id: 'totalExpenses', label: 'Expenses' },
    { id: 'net', label: 'Net' },
]

const COMPARISON_LABEL: Record<Comparison, string> = { none: '', previous: 'Previous period', 'last-year': 'Last year' }

type Props = {
    buckets: PnlBucket[]
    /** Comparison period bucketed the same way, aligned by position, or null. */
    comparisonBuckets: PnlBucket[] | null
    compare: Comparison
}

/**
 * Revenue vs expenses over the selected period, from the same `pnlBuckets()`
 * the P&L table renders. "Overview" plots the three lines for this period;
 * picking one metric plots it against the comparison period instead, so the
 * chart never carries six lines at once.
 */
export default function PnlTrend({ buckets, comparisonBuckets, compare }: Props) {
    const [view, setView] = useState<View>('overview')
    const single = view !== 'overview'

    const data = buckets.map((bucket, index) => ({
        label: bucket.label,
        netIncome: bucket.netIncome,
        totalExpenses: bucket.totalExpenses,
        net: bucket.net,
        comparison: single && comparisonBuckets?.[index] ? comparisonBuckets[index][view] : null,
    }))

    const series = single
        ? [
            { key: view, label: VIEWS.find((v) => v.id === view)?.label ?? '' },
            ...(comparisonBuckets ? [{ key: 'comparison', label: COMPARISON_LABEL[compare], comparison: true }] : []),
        ]
        : [
            { key: 'netIncome', label: 'Revenue' },
            { key: 'totalExpenses', label: 'Expenses' },
            { key: 'net', label: 'Net' },
        ]

    const chip = 'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    // Only offer the single-metric views when there is a comparison to show
    // against; without one they would just be the overview minus two lines.
    const views = comparisonBuckets ? VIEWS : VIEWS.slice(0, 1)

    return (
        <div className="space-y-2">
            {views.length > 1 && (
                <div className="flex justify-end print:hidden">
                    <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Trend view">
                        {views.map((v) => (
                            <button key={v.id} type="button" onClick={() => setView(v.id)} aria-pressed={view === v.id} className={`${chip} ${view === v.id ? on : off}`}>
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <TrendChart
                title={single ? `${VIEWS.find((v) => v.id === view)?.label} vs ${COMPARISON_LABEL[compare].toLowerCase()}` : 'Revenue vs expenses'}
                subtitle={single ? 'Dashed line: comparison period, aligned bucket by bucket' : 'Net income, expenses and net per period'}
                data={data}
                xKey="label"
                series={series}
                format="currency"
                variant="line"
                height={280}
                emptyMessage="No income or expenses in this period"
            />
        </div>
    )
}

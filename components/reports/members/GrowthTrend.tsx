'use client'

import { useState } from 'react'
import TrendChart from '@/components/reports/charts/TrendChart'
import StackedBarChart from '@/components/reports/charts/StackedBarChart'
import type { JoinBucket } from '@/lib/reports/members-aggregate'
import type { Comparison } from '@/lib/reports/comparison'

type View = 'joins' | 'net'

const COMPARISON_LABEL: Record<Comparison, string> = { none: '', previous: 'Previous period', 'last-year': 'Last year' }

type Props = {
    buckets: JoinBucket[]
    /** Comparison period bucketed the same way, aligned by position, or null. */
    comparisonBuckets: JoinBucket[] | null
    compare: Comparison
}

/**
 * Member growth over the selected period, from the same `joinBuckets()` the
 * summary and insight read. "New joins" plots joins against the comparison
 * period; "Net growth" plots joins, churned and joins − churned — a count of
 * members, not of revenue.
 */
export default function GrowthTrend({ buckets, comparisonBuckets, compare }: Props) {
    const [view, setView] = useState<View>('joins')

    const chip = 'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="space-y-2">
            <div className="flex justify-end print:hidden">
                <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Growth view">
                    {([['joins', 'New joins'], ['net', 'Net growth']] as [View, string][]).map(([id, label]) => (
                        <button key={id} type="button" onClick={() => setView(id)} aria-pressed={view === id} className={`${chip} ${view === id ? on : off}`}>{label}</button>
                    ))}
                </div>
            </div>
            {view === 'joins' ? (
                <TrendChart
                    title="New joins"
                    subtitle={comparisonBuckets ? `Dashed line: ${COMPARISON_LABEL[compare].toLowerCase()}, aligned bucket by bucket` : 'Members who joined per period'}
                    data={buckets.map((b, i) => ({ label: b.label, joins: b.joins, comparison: comparisonBuckets?.[i]?.joins ?? null }))}
                    xKey="label"
                    series={[
                        { key: 'joins', label: 'This period' },
                        ...(comparisonBuckets ? [{ key: 'comparison', label: COMPARISON_LABEL[compare], comparison: true }] : []),
                    ]}
                    format="number"
                    height={260}
                    emptyMessage="No new joins in this period"
                />
            ) : (
                <StackedBarChart
                    title="Net member growth"
                    subtitle="New joins less memberships that ended without renewing (the Retention tab's churned figure)"
                    data={buckets.map((b) => ({ label: b.label, joins: b.joins, churned: -b.churned, net: b.net }))}
                    xKey="label"
                    series={[{ key: 'joins', label: 'Joined' }, { key: 'churned', label: 'Churned' }, { key: 'net', label: 'Net' }]}
                    stacked={false}
                    format="number"
                    height={260}
                    emptyMessage="No joins or churn in this period"
                />
            )}
        </div>
    )
}

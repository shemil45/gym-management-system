'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartFrame, { type ChartState } from '@/components/reports/charts/ChartFrame'
import ChartTooltip, { type TooltipProps } from '@/components/reports/charts/ChartTooltip'
import { seriesColor, useChartPalette } from '@/components/reports/charts/chart-theme'
import { formatShare, formatValue, type ValueFormat } from '@/lib/reports/chart-format'

export type ShareSlice = {
    label: string
    value: number
    color?: string
    /** Muted text after the label in the bar variant — a count, an average. */
    detail?: string
}

export type ShareChartProps = {
    data: ShareSlice[]
    format?: ValueFormat
    /**
     * `bar` (default) — ranked horizontal bars. Readable at any number of
     * categories, keeps the exact values visible, and prints cleanly.
     * `donut` — only worth it for a small set of parts of an obvious whole
     * (payment method mix, say). Not the default on purpose: a donut is worse
     * than a bar list at everything except showing "share of one total".
     */
    variant?: 'bar' | 'donut'
    /** Cap the rows shown; the rest collapse into a single "Other" row. */
    maxItems?: number
    /** `value` (default) ranks largest first; `given` keeps the caller's order,
     *  for ordinal categories such as weeks or engagement tiers. */
    order?: 'value' | 'given'
    title?: string
    subtitle?: string
    height?: number
    state?: ChartState
    emptyMessage?: string
    errorMessage?: string
}

/** Ranked, optionally truncated with an "Other" row carrying the remainder. */
function prepare(data: ShareSlice[], maxItems?: number, order: 'value' | 'given' = 'value'): ShareSlice[] {
    const kept = [...data].filter((slice) => slice.value > 0)
    const ranked = order === 'value' ? kept.sort((a, b) => b.value - a.value) : kept
    if (!maxItems || ranked.length <= maxItems) return ranked
    const head = ranked.slice(0, maxItems)
    const rest = ranked.slice(maxItems).reduce((sum, slice) => sum + slice.value, 0)
    return rest > 0 ? [...head, { label: 'Other', value: rest }] : head
}

/**
 * How one total splits across categories: revenue by plan, method mix, plan
 * distribution, expense categories, referral outcomes.
 */
export default function ShareChart({
    data,
    format = 'number',
    variant = 'bar',
    maxItems,
    order = 'value',
    title,
    subtitle,
    height = 260,
    state = 'ready',
    emptyMessage,
    errorMessage,
}: ShareChartProps) {
    const palette = useChartPalette()

    const slices = prepare(data, maxItems, order).map((slice, index) => ({ ...slice, color: slice.color ?? seriesColor(palette, index) }))
    const total = slices.reduce((sum, slice) => sum + slice.value, 0)
    const isEmpty = slices.length === 0 || total <= 0

    const frame = {
        title, subtitle, state, isEmpty, emptyMessage, errorMessage,
    }

    if (variant === 'donut') {
        return (
            <ChartFrame {...frame} height={height}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={slices} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="82%" paddingAngle={1.5} stroke="none">
                            {slices.map((slice) => <Cell key={slice.label} fill={slice.color} />)}
                        </Pie>
                        <Tooltip content={(props: TooltipProps) => <ChartTooltip {...props} palette={palette} format={format} />} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartFrame>
        )
    }

    return (
        <ChartFrame {...frame} height={height} autoHeight>
            <ul className="space-y-2.5">
                {slices.map((slice) => (
                    <li key={slice.label}>
                        <div className="flex items-baseline justify-between gap-3 text-xs">
                            <span className="truncate text-gray-700 dark:text-neutral-300">
                                {slice.label}
                                {slice.detail ? <span className="ml-1.5 text-gray-400 dark:text-neutral-500">{slice.detail}</span> : null}
                            </span>
                            <span className="shrink-0 tabular-nums text-gray-500 dark:text-neutral-400">
                                <span className="font-semibold text-gray-900 dark:text-white">{formatValue(slice.value, format)}</span>
                                {' · '}{formatShare(slice.value, total)}
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                            <div
                                className="h-full rounded-full"
                                style={{ width: `${total ? (slice.value / total) * 100 : 0}%`, backgroundColor: slice.color }}
                            />
                        </div>
                    </li>
                ))}
            </ul>
        </ChartFrame>
    )
}

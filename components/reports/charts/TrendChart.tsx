'use client'

import { useId } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartLegend, type ChartState } from '@/components/reports/charts/ChartFrame'
import ChartTooltip, { type TooltipProps } from '@/components/reports/charts/ChartTooltip'
import { seriesColor, useChartPalette } from '@/components/reports/charts/chart-theme'
import { formatAxisValue, type ValueFormat } from '@/lib/reports/chart-format'

export type TrendSeries = {
    /** Field on each row. */
    key: string
    label: string
    /** Defaults to the palette entry for this series' position. */
    color?: string
    /** Renders muted and dashed — for a comparison period. */
    comparison?: boolean
}

export type TrendChartProps = {
    /** Rows straight from an existing aggregate — one per bucket. */
    data: Record<string, unknown>[]
    /** Field holding the bucket label, e.g. `label` on every `*Bucket` type. */
    xKey: string
    series: TrendSeries[]
    format?: ValueFormat
    /** `area` suits a single series; `line` is clearer once there are several. */
    variant?: 'area' | 'line'
    title?: string
    subtitle?: string
    height?: number
    state?: ChartState
    emptyMessage?: string
    errorMessage?: string
    showLegend?: boolean
}

function numberAt(row: Record<string, unknown>, key: string): number | null {
    const value = row[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Bucketed metric over time — revenue, expenses, transactions, footfall,
 * joins, retention, anything a report already aggregates into buckets.
 *
 * It takes rows and field names, never a report-specific shape, and it does no
 * fetching or aggregation of its own: pass the buckets an existing aggregate
 * already returned. A comparison period is just another series flagged
 * `comparison: true`.
 */
export default function TrendChart({
    data,
    xKey,
    series,
    format = 'number',
    variant,
    title,
    subtitle,
    height = 260,
    state = 'ready',
    emptyMessage,
    errorMessage,
    showLegend,
}: TrendChartProps) {
    const palette = useChartPalette()
    const gradientId = useId()

    const resolved = series.map((entry, index) => ({
        ...entry,
        color: entry.color ?? (entry.comparison ? palette.comparison : seriesColor(palette, index)),
    }))

    // Empty means "nothing to plot": no rows, or every plotted value is zero
    // or missing. A period of genuine zeros is not worth a flat line.
    const isEmpty = data.length === 0
        || !data.some((row) => resolved.some((entry) => (numberAt(row, entry.key) ?? 0) !== 0))

    const shape = variant ?? (resolved.filter((entry) => !entry.comparison).length === 1 ? 'area' : 'line')
    const legend = showLegend ?? resolved.length > 1

    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            height={height}
            state={state}
            isEmpty={isEmpty}
            emptyMessage={emptyMessage}
            errorMessage={errorMessage}
            action={legend ? <ChartLegend items={resolved.map((entry) => ({ label: entry.label, color: entry.color }))} /> : undefined}
        >
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
                    <defs>
                        {resolved.map((entry) => (
                            <linearGradient key={entry.key} id={`${gradientId}-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={entry.color} stopOpacity={0.24} />
                                <stop offset="100%" stopColor={entry.color} stopOpacity={0.02} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid stroke={palette.grid} vertical={false} />
                    <XAxis
                        dataKey={xKey}
                        tick={{ fontSize: 10.5, fill: palette.axis }}
                        tickLine={false}
                        axisLine={{ stroke: palette.axisLine }}
                        minTickGap={24}
                    />
                    <YAxis
                        tickFormatter={(value: number) => formatAxisValue(value, format)}
                        tick={{ fontSize: 10.5, fill: palette.axis }}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                    />
                    <Tooltip
                        cursor={{ stroke: palette.grid }}
                        content={(props: TooltipProps) => <ChartTooltip {...props} palette={palette} format={format} />}
                    />
                    {resolved.map((entry) =>
                        shape === 'area' && !entry.comparison ? (
                            <Area
                                key={entry.key}
                                type="monotone"
                                dataKey={entry.key}
                                name={entry.label}
                                stroke={entry.color}
                                strokeWidth={1.8}
                                fill={`url(#${gradientId}-${entry.key})`}
                                dot={false}
                                activeDot={{ r: 3, fill: entry.color, strokeWidth: 0 }}
                            />
                        ) : (
                            <Line
                                key={entry.key}
                                type="monotone"
                                dataKey={entry.key}
                                name={entry.label}
                                stroke={entry.color}
                                strokeWidth={entry.comparison ? 1.3 : 1.8}
                                strokeDasharray={entry.comparison ? '4 3' : undefined}
                                dot={false}
                                activeDot={{ r: 3, fill: entry.color, strokeWidth: 0 }}
                            />
                        ),
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </ChartFrame>
    )
}

'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartLegend, type ChartState } from '@/components/reports/charts/ChartFrame'
import ChartTooltip, { type TooltipProps } from '@/components/reports/charts/ChartTooltip'
import { seriesColor, useChartPalette } from '@/components/reports/charts/chart-theme'
import { formatAxisValue, type ValueFormat } from '@/lib/reports/chart-format'

export type BarSeries = { key: string; label: string; color?: string }

export type StackedBarChartProps = {
    /** Rows from an existing aggregate — one per bucket. */
    data: Record<string, unknown>[]
    xKey: string
    series: BarSeries[]
    format?: ValueFormat
    /** Off gives grouped bars side by side instead of one stack. */
    stacked?: boolean
    title?: string
    subtitle?: string
    height?: number
    state?: ChartState
    emptyMessage?: string
    errorMessage?: string
}

/**
 * A composition over time: payment methods per bucket, expense categories per
 * bucket, renewed vs churned, whatever a report already groups.
 *
 * Generic in the same way as TrendChart — field names in, no report-specific
 * knowledge, no data fetching.
 */
export default function StackedBarChart({
    data,
    xKey,
    series,
    format = 'number',
    stacked = true,
    title,
    subtitle,
    height = 260,
    state = 'ready',
    emptyMessage,
    errorMessage,
}: StackedBarChartProps) {
    const palette = useChartPalette()

    const resolved = series.map((entry, index) => ({ ...entry, color: entry.color ?? seriesColor(palette, index) }))

    const valueAt = (row: Record<string, unknown>, key: string) => {
        const value = row[key]
        return typeof value === 'number' && Number.isFinite(value) ? value : 0
    }
    const isEmpty = data.length === 0 || !data.some((row) => resolved.some((entry) => valueAt(row, entry.key) !== 0))

    // Drop series that are zero across every bucket, so an unused payment
    // method or expense category does not occupy the legend.
    const used = resolved.filter((entry) => data.some((row) => valueAt(row, entry.key) !== 0))
    const plotted = used.length > 0 ? used : resolved

    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            height={height}
            state={state}
            isEmpty={isEmpty}
            emptyMessage={emptyMessage}
            errorMessage={errorMessage}
            action={<ChartLegend items={plotted.map((entry) => ({ label: entry.label, color: entry.color }))} />}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
                    <CartesianGrid stroke={palette.grid} vertical={false} />
                    <XAxis
                        dataKey={xKey}
                        tick={{ fontSize: 10.5, fill: palette.axis }}
                        tickLine={false}
                        axisLine={{ stroke: palette.axisLine }}
                        minTickGap={16}
                    />
                    <YAxis
                        tickFormatter={(value: number) => formatAxisValue(value, format)}
                        tick={{ fontSize: 10.5, fill: palette.axis }}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                    />
                    <Tooltip
                        cursor={{ fill: palette.grid, fillOpacity: 0.35 }}
                        content={(props: TooltipProps) => <ChartTooltip {...props} palette={palette} format={format} showTotal={stacked} />}
                    />
                    {plotted.map((entry, index) => (
                        <Bar
                            key={entry.key}
                            dataKey={entry.key}
                            name={entry.label}
                            stackId={stacked ? 'stack' : undefined}
                            fill={entry.color}
                            maxBarSize={stacked ? 34 : 18}
                            // Only the top segment of a stack gets rounded corners.
                            radius={stacked ? (index === plotted.length - 1 ? [3, 3, 0, 0] : undefined) : [3, 3, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </ChartFrame>
    )
}

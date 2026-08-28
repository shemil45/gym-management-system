'use client'

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

type Point = { date: string; volume: number }

function formatDay(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
    })
}

function formatAxisMoney(value: number) {
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`
    if (value >= 1_000) return `₹${Math.round(value / 1_000)}k`
    return `₹${value}`
}

function ChartTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
}) {
    if (!active || !payload?.length) return null

    return (
        <div className="rounded-[var(--p-r-control)] border border-[var(--p-line)] bg-[var(--p-surface)] px-2.5 py-2 shadow-[var(--p-shadow-lift)]">
            <p className="text-[11px] text-[var(--p-ink-3)]">{label ? formatDay(label) : ''}</p>
            <p className="p-num mt-0.5 text-[13px] font-semibold text-[var(--p-ink)]">
                {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                }).format(payload[0].value)}
            </p>
        </div>
    )
}

/**
 * 30-day payment volume across every tenant.
 *
 * This is gross volume moving through gyms on the platform, not platform
 * revenue - the two are labelled distinctly everywhere they appear, because
 * conflating them is how a SaaS dashboard ends up reporting a number 40x its
 * actual income.
 */
export default function VolumeChart({ data }: { data: Point[] }) {
    const total = data.reduce((sum, point) => sum + point.volume, 0)

    if (total === 0) {
        return (
            <div className="flex h-[180px] items-center justify-center px-6 text-center">
                <p className="max-w-[42ch] text-[12.5px] leading-[1.55] text-[var(--p-ink-3)]">
                    No payments recorded across any tenant in the last 30 days. This chart fills in as
                    gyms take payments.
                </p>
            </div>
        )
    }

    return (
        <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
                    <defs>
                        <linearGradient id="platform-volume" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--p-accent)" stopOpacity={0.26} />
                            <stop offset="100%" stopColor="var(--p-accent)" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--p-line-soft)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDay}
                        tick={{ fontSize: 10.5, fill: 'var(--p-ink-3)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--p-line)' }}
                        minTickGap={28}
                    />
                    <YAxis
                        tickFormatter={formatAxisMoney}
                        tick={{ fontSize: 10.5, fill: 'var(--p-ink-3)' }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--p-line-strong)' }} />
                    <Area
                        type="monotone"
                        dataKey="volume"
                        stroke="var(--p-accent)"
                        strokeWidth={1.6}
                        fill="url(#platform-volume)"
                        // Dots only on hover: 30 permanent dots on a dense
                        // dashboard is noise, but the active dot confirms
                        // which day the tooltip is reading.
                        dot={false}
                        activeDot={{ r: 3, fill: 'var(--p-accent)', strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

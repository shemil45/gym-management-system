'use client'

import { formatValue, type ValueFormat } from '@/lib/reports/chart-format'
import type { ChartPalette } from '@/components/reports/charts/chart-theme'

/** What recharts hands a custom tooltip. Typed locally so the charts stay
 *  independent of recharts' internal generics. */
export type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string | number }
// `payload` is readonly to stay assignable from recharts' own tooltip props.
export type TooltipProps = { active?: boolean; payload?: readonly TooltipEntry[]; label?: string | number }

type Props = TooltipProps & {
    palette: ChartPalette
    format: ValueFormat
    /** Adds a total row under the entries — used by the stacked bar chart. */
    showTotal?: boolean
}

/** The one tooltip every report chart uses. */
export default function ChartTooltip({ active, payload, label, palette, format, showTotal = false }: Props) {
    if (!active || !payload?.length) return null

    const entries = payload.filter((entry) => entry.value !== undefined && entry.value !== null)
    if (entries.length === 0) return null

    const total = entries.reduce((sum, entry) => sum + (typeof entry.value === 'number' ? entry.value : 0), 0)

    return (
        <div
            className="rounded-lg border px-2.5 py-2 text-xs shadow-sm"
            style={{ backgroundColor: palette.surface, borderColor: palette.surfaceBorder, color: palette.ink }}
        >
            {label !== undefined ? <p className="mb-1 font-medium" style={{ color: palette.inkMuted }}>{label}</p> : null}
            <ul className="space-y-0.5">
                {entries.map((entry, index) => (
                    <li key={`${entry.dataKey ?? entry.name ?? index}`} className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                        <span style={{ color: palette.inkMuted }}>{entry.name}</span>
                        <span className="ml-auto font-semibold tabular-nums">
                            {typeof entry.value === 'number' ? formatValue(entry.value, format) : entry.value}
                        </span>
                    </li>
                ))}
                {showTotal && entries.length > 1 ? (
                    <li className="mt-1 flex items-center gap-2 border-t pt-1" style={{ borderColor: palette.surfaceBorder }}>
                        <span style={{ color: palette.inkMuted }}>Total</span>
                        <span className="ml-auto font-semibold tabular-nums">{formatValue(total, format)}</span>
                    </li>
                ) : null}
            </ul>
        </div>
    )
}

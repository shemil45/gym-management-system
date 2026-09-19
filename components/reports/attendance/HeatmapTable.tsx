import type { Heatmap } from '@/lib/reports/attendance-aggregate'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const thNum = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

const COLUMN_COUNT = 9

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** Cell shading: alpha rises from 0.08 to 0.8 with the count's share of the
 * busiest cell, 0 when the cell is empty. `--heat` feeds the arbitrary
 * `rgb(.../var(--heat))` classes; text flips to white past the point where
 * the dark fill in light mode would otherwise wash it out. */
function heatCell(count: number, max: number) {
    const ratio = max > 0 ? count / max : 0
    const alpha = count === 0 ? 0 : 0.08 + 0.72 * ratio
    return { alpha, ratio }
}

export default function HeatmapTable({ heatmap }: { heatmap: Heatmap }) {
    const empty = heatmap.hours.length === 0 || heatmap.max === 0

    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    {!empty && heatmap.busiest && (
                        <caption className="caption-bottom border-t border-gray-200 bg-gray-50/60 px-3 py-2.5 text-left text-xs text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
                            Busiest: {WEEKDAYS[heatmap.busiest.weekday]} {formatHour(heatmap.busiest.hour)} · {heatmap.busiest.count} visits
                        </caption>
                    )}
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                        <tr>
                            <th className={th}>Hour</th>
                            {WEEKDAYS.map((day) => <th key={day} className={thNum}>{day}</th>)}
                            <th className={thNum}>Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {empty && (
                            <tr><td colSpan={COLUMN_COUNT} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No visits in this period</td></tr>
                        )}
                        {!empty && heatmap.hours.map((hour, hourIndex) => (
                            <tr key={hour}>
                                <td className={`${td} whitespace-nowrap`}>{formatHour(hour)}</td>
                                {WEEKDAYS.map((_, weekday) => {
                                    const count = heatmap.cells[hourIndex][weekday]
                                    const { alpha, ratio } = heatCell(count, heatmap.max)
                                    // Crossover ratios where each theme's composite (fill over its own
                                    // background) reaches equal contrast against light vs. dark ink,
                                    // solved independently: light mode (near-black over white) crosses
                                    // at ratio ≈ 0.68, dark mode (white over neutral-900) at ≈ 0.50. Do
                                    // not collapse these back to one shared threshold.
                                    const light = ratio > 0.68 ? 'text-white' : 'text-gray-900'
                                    const dark = ratio > 0.5 ? 'dark:text-neutral-900' : 'dark:text-white'
                                    return (
                                        <td
                                            key={weekday}
                                            style={{ '--heat': alpha } as React.CSSProperties}
                                            className={`px-3 py-2 text-right text-sm tabular-nums bg-[rgb(17_24_39/var(--heat))] dark:bg-[rgb(255_255_255/var(--heat))] ${light} ${dark}`}
                                        >
                                            {count || '—'}
                                        </td>
                                    )
                                })}
                                <td className={numStrong}>{heatmap.rowTotals[hourIndex]}</td>
                            </tr>
                        ))}
                    </tbody>
                    {!empty && (
                        <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:bg-neutral-800/40 dark:border-neutral-700">
                            <tr>
                                <td className={`${td} font-medium text-gray-900 dark:text-white`}>Total</td>
                                {heatmap.colTotals.map((total, weekday) => <td key={weekday} className={numStrong}>{total}</td>)}
                                <td className={numStrong}>{heatmap.colTotals.reduce((s, c) => s + c, 0)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </section>
    )
}

import type { CohortReport } from '@/lib/reports/members-aggregate'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 whitespace-nowrap'
const td = 'px-3 py-2 text-sm tabular-nums text-gray-800 dark:text-neutral-200 whitespace-nowrap'

/**
 * Month-by-month retention of each join cohort. Shading is the cell's share
 * of 100%, using the same `--heat` alpha and per-theme text flip as HeatGrid,
 * so the two grids read the same way. Future months are blank, not zero.
 */
export default function CohortTable({ cohorts }: { cohorts: CohortReport }) {
    const { rows, months } = cohorts
    const empty = rows.length === 0

    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 print:break-inside-avoid">
            <header className="border-b border-gray-200 px-3 py-2.5 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cohort retention</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
                    Share of each join month&apos;s members holding a membership in the months after joining. Month 0 is the join month; blank cells are months not yet reached.
                </p>
            </header>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:border-neutral-700 dark:bg-neutral-800/40">
                        <tr>
                            <th scope="col" className={`${th} text-left`}>Joined</th>
                            <th scope="col" className={th}>Members</th>
                            {Array.from({ length: months }, (_, k) => <th key={k} scope="col" className={th}>M{k}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {empty && (
                            <tr><td colSpan={2} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>No members joined in this period</td></tr>
                        )}
                        {rows.map((row) => (
                            <tr key={row.cohort}>
                                <th scope="row" className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{row.label}</th>
                                <td className={`${td} text-right`}>{row.members}</td>
                                {row.retained.map((value, k) => {
                                    if (value === null) return <td key={k} className={`${td} text-right text-gray-300 dark:text-neutral-600`}>—</td>
                                    const ratio = value / 100
                                    const alpha = value === 0 ? 0 : 0.08 + 0.72 * ratio
                                    const light = ratio > 0.68 ? 'text-white' : 'text-gray-900'
                                    const dark = ratio > 0.5 ? 'dark:text-neutral-900' : 'dark:text-white'
                                    return (
                                        <td
                                            key={k}
                                            title={`${row.label}, month ${k}: ${value.toFixed(1)}% of ${row.members}`}
                                            style={{ '--heat': alpha } as React.CSSProperties}
                                            className={`report-heat-cell px-3 py-2 text-right text-sm tabular-nums bg-[rgb(17_24_39/var(--heat))] dark:bg-[rgb(255_255_255/var(--heat))] ${light} ${dark}`}
                                        >
                                            {value.toFixed(0)}%
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

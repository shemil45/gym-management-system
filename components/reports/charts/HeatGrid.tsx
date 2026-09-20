export type HeatGridProps = {
    /** Row headers, top to bottom — hours, for attendance. */
    rows: string[]
    /** Column headers, left to right — weekdays, for attendance. */
    columns: string[]
    /** `cells[rowIndex][columnIndex]`, matching the two header arrays. */
    cells: number[][]
    /** Noun for the tooltip and screen-reader label, e.g. `visits`. */
    unit: string
    rowHeader?: string
    /** Adds a trailing total column and a footer total row. */
    showTotals?: boolean
    title?: string
    subtitle?: string
    /** Caption under the grid — the busiest cell, typically. */
    caption?: string
    emptyMessage?: string
    state?: 'ready' | 'loading' | 'error'
    errorMessage?: string
}

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const thNum = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const numStrong = 'px-3 py-2 text-sm whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-white'

/**
 * Two-dimensional density grid — hours × weekdays for attendance, but the
 * component knows nothing about either: it takes row labels, column labels and
 * a matrix of counts.
 *
 * Deliberately a real `<table>` rather than an SVG chart: the counts stay
 * selectable, screen readers get a proper header/cell relationship, and it
 * prints without a canvas. Shading is pure CSS off a `--heat` alpha, so it
 * needs no theme lookup and cannot flash the wrong palette on hydration.
 *
 * Cell shading is the count's share of the busiest cell, with the text
 * flipping colour once the fill would otherwise wash it out — the crossover
 * differs per theme and must not be collapsed into one shared threshold.
 *
 * There is no "% utilisation" here, and there should not be: the database has
 * no capacity field, so only relative busy-ness can be stated honestly.
 */
export default function HeatGrid({
    rows,
    columns,
    cells,
    unit,
    rowHeader = '',
    showTotals = true,
    title,
    subtitle,
    caption,
    emptyMessage = 'No activity in this period',
    state = 'ready',
    errorMessage = 'This grid could not be loaded',
}: HeatGridProps) {
    const max = cells.reduce((best, row) => row.reduce((rowBest, count) => (count > rowBest ? count : rowBest), best), 0)
    const isEmpty = rows.length === 0 || columns.length === 0 || max === 0
    const columnCount = columns.length + 1 + (showTotals ? 1 : 0)

    const rowTotals = cells.map((row) => row.reduce((sum, count) => sum + count, 0))
    const columnTotals = columns.map((_, index) => cells.reduce((sum, row) => sum + (row[index] ?? 0), 0))
    const grandTotal = columnTotals.reduce((sum, count) => sum + count, 0)

    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 print:break-inside-avoid">
            {title ? (
                <header className="border-b border-gray-200 px-3 py-2.5 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                    {subtitle ? <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">{subtitle}</p> : null}
                </header>
            ) : null}

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    {caption && !isEmpty && state === 'ready' ? (
                        <caption className="caption-bottom border-t border-gray-200 bg-gray-50/60 px-3 py-2.5 text-left text-xs text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
                            {caption}
                        </caption>
                    ) : null}
                    <thead className="border-b border-gray-200 bg-gray-50/60 dark:border-neutral-700 dark:bg-neutral-800/40">
                        <tr>
                            <th scope="col" className={th}>{rowHeader}</th>
                            {columns.map((column) => <th key={column} scope="col" className={thNum}>{column}</th>)}
                            {showTotals ? <th scope="col" className={thNum}>Total</th> : null}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {state !== 'ready' || isEmpty ? (
                            <tr>
                                <td colSpan={columnCount} className={`${td} py-10 text-center text-gray-500 dark:text-neutral-400`}>
                                    {state === 'error' ? errorMessage : state === 'loading' ? 'Loading…' : emptyMessage}
                                </td>
                            </tr>
                        ) : null}
                        {state === 'ready' && !isEmpty ? rows.map((row, rowIndex) => (
                            <tr key={row}>
                                <th scope="row" className={`${td} whitespace-nowrap font-normal`}>{row}</th>
                                {columns.map((column, columnIndex) => {
                                    const count = cells[rowIndex]?.[columnIndex] ?? 0
                                    const ratio = max > 0 ? count / max : 0
                                    const alpha = count === 0 ? 0 : 0.08 + 0.72 * ratio
                                    // Crossover ratios where each theme's composite (fill over its own
                                    // background) reaches equal contrast against light vs. dark ink,
                                    // solved independently: light mode (near-black over white) crosses
                                    // at ratio ≈ 0.68, dark mode (white over neutral-900) at ≈ 0.50. Do
                                    // not collapse these back to one shared threshold.
                                    const light = ratio > 0.68 ? 'text-white' : 'text-gray-900'
                                    const dark = ratio > 0.5 ? 'dark:text-neutral-900' : 'dark:text-white'
                                    return (
                                        <td
                                            key={column}
                                            title={`${column} ${row} · ${count} ${unit}`}
                                            aria-label={`${column} ${row}: ${count} ${unit}`}
                                            style={{ '--heat': alpha } as React.CSSProperties}
                                            className={`report-heat-cell px-3 py-2 text-right text-sm tabular-nums bg-[rgb(17_24_39/var(--heat))] dark:bg-[rgb(255_255_255/var(--heat))] ${light} ${dark}`}
                                        >
                                            {count || '—'}
                                        </td>
                                    )
                                })}
                                {showTotals ? <td className={numStrong}>{rowTotals[rowIndex]}</td> : null}
                            </tr>
                        )) : null}
                    </tbody>
                    {showTotals && state === 'ready' && !isEmpty ? (
                        <tfoot className="border-t border-gray-200 bg-gray-50/60 dark:border-neutral-700 dark:bg-neutral-800/40">
                            <tr>
                                <th scope="row" className={`${td} font-medium text-gray-900 dark:text-white`}>Total</th>
                                {columnTotals.map((total, index) => <td key={columns[index]} className={numStrong}>{total}</td>)}
                                <td className={numStrong}>{grandTotal}</td>
                            </tr>
                        </tfoot>
                    ) : null}
                </table>
            </div>
        </section>
    )
}

'use client'

import { ChartSkeleton } from '@/components/reports/ReportSkeleton'

export type ChartState = 'ready' | 'loading' | 'error'

export type ChartFrameProps = {
    title?: string
    subtitle?: string
    /** Controls rendered top-right, e.g. a legend or a toggle. */
    action?: React.ReactNode
    height?: number
    /** Let the content size itself — for charts built from flow layout rather
     *  than a fixed SVG plot. `height` still sizes the empty/error/loading box. */
    autoHeight?: boolean
    state?: ChartState
    /** True when the data arrived but holds nothing worth plotting. */
    isEmpty?: boolean
    emptyMessage?: string
    errorMessage?: string
    children?: React.ReactNode
}

/**
 * The card every report chart sits in: title row, fixed plot height, and the
 * three states each chart must handle. Loading reuses the reports' existing
 * skeleton system rather than introducing a second loading look.
 *
 * `print:break-inside-avoid` keeps a chart from being split across pages when
 * a report is printed.
 */
export default function ChartFrame({
    title,
    subtitle,
    action,
    height = 260,
    autoHeight = false,
    state = 'ready',
    isEmpty = false,
    emptyMessage = 'No data in this period',
    errorMessage = 'This chart could not be loaded',
    children,
}: ChartFrameProps) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 print:break-inside-avoid print:bg-white">
            {title || action ? (
                <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        {title ? <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3> : null}
                        {subtitle ? <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">{subtitle}</p> : null}
                    </div>
                    {action ? <div className="shrink-0 print:hidden">{action}</div> : null}
                </header>
            ) : null}

            {state === 'loading' ? <ChartSkeleton height={height} /> : null}

            {state === 'error' ? (
                <div className="flex items-center justify-center text-center" style={{ height }}>
                    <p className="max-w-[40ch] text-sm text-gray-500 dark:text-neutral-400">{errorMessage}</p>
                </div>
            ) : null}

            {state === 'ready' && isEmpty ? (
                <div className="flex items-center justify-center text-center" style={{ height }}>
                    <p className="max-w-[40ch] text-sm text-gray-500 dark:text-neutral-400">{emptyMessage}</p>
                </div>
            ) : null}

            {state === 'ready' && !isEmpty ? <div style={autoHeight ? undefined : { height }}>{children}</div> : null}
        </section>
    )
}

/** Swatch legend shared by the multi-series charts. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
    return (
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {items.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-neutral-400">
                    <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: item.color }} aria-hidden="true" />
                    {item.label}
                </li>
            ))}
        </ul>
    )
}

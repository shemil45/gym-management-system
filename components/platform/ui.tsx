import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Platform Portal primitives.
 *
 * Every visual decision here comes from the locked token set in
 * app/platform/platform.css. Components take a `tone`, never a raw color, so
 * the palette can only be changed in one place.
 */

type Tone = 'ok' | 'warn' | 'danger' | 'accent' | 'idle'

/* ── status ───────────────────────────────────────────────────────────── */

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
    return (
        <span className="p-pill" data-tone={tone}>
            {children}
        </span>
    )
}

/** Maps a tenant lifecycle state to a tone plus the words an operator uses. */
export function tenantStatusTone(status: string): { tone: Tone; label: string } {
    switch (status) {
        case 'active':
            return { tone: 'ok', label: 'Active' }
        case 'trialing':
            return { tone: 'accent', label: 'Trial' }
        case 'suspended':
            return { tone: 'danger', label: 'Suspended' }
        case 'cancelled':
            return { tone: 'idle', label: 'Cancelled' }
        case 'past_due':
            return { tone: 'warn', label: 'Past due' }
        case 'paused':
            return { tone: 'idle', label: 'Paused' }
        case 'completed':
            return { tone: 'ok', label: 'Complete' }
        case 'in_progress':
            return { tone: 'warn', label: 'In progress' }
        case 'pending':
            return { tone: 'warn', label: 'Pending' }
        case 'stalled':
            return { tone: 'danger', label: 'Stalled' }
        default:
            return { tone: 'idle', label: status.replace(/_/g, ' ') }
    }
}

/* ── containers ───────────────────────────────────────────────────────── */

export function Panel({
    children,
    className,
    padded = true,
}: {
    children: ReactNode
    className?: string
    padded?: boolean
}) {
    return <section className={cn('p-panel', padded && 'p-4', className)}>{children}</section>
}

export function PanelHeader({
    title,
    description,
    action,
}: {
    title: string
    description?: ReactNode
    action?: ReactNode
}) {
    return (
        <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
                <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-[var(--p-ink)]">{title}</h2>
                {description ? (
                    <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[var(--p-ink-3)]">{description}</p>
                ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    )
}

export function PageHeader({
    title,
    description,
    action,
}: {
    title: string
    description?: string
    action?: ReactNode
}) {
    return (
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[var(--p-ink)]">
                    {title}
                </h1>
                {description ? (
                    <p className="mt-1 max-w-[70ch] text-[13px] leading-[1.55] text-[var(--p-ink-3)]">
                        {description}
                    </p>
                ) : null}
            </div>
            {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
    )
}

/**
 * A single headline figure.
 *
 * No card border by default: at density 8 a grid of bordered boxes reads as
 * clutter, so tiles are separated by hairlines from the parent grid instead.
 */
export function MetricTile({
    label,
    value,
    unit,
    footnote,
    tone,
}: {
    label: string
    value: string
    unit?: string
    footnote?: string
    tone?: Tone
}) {
    return (
        <div className="px-4 py-3.5">
            <p className="p-label">{label}</p>
            <p className="mt-1.5 flex items-baseline gap-1">
                <span
                    className={cn(
                        'p-num text-[25px] font-semibold leading-none tracking-[-0.02em]',
                        tone === 'danger' && 'text-[var(--p-danger)]',
                        tone === 'warn' && 'text-[var(--p-warn-ink)]',
                        tone === 'ok' && 'text-[var(--p-ok-ink)]',
                        !tone && 'text-[var(--p-ink)]',
                    )}
                >
                    {value}
                </span>
                {unit ? <span className="text-[12.5px] text-[var(--p-ink-3)]">{unit}</span> : null}
            </p>
            {footnote ? (
                <p className="mt-1.5 text-[12px] leading-[1.45] text-[var(--p-ink-3)]">{footnote}</p>
            ) : null}
        </div>
    )
}

/* ── controls ─────────────────────────────────────────────────────────── */

export function Button({
    children,
    tone = 'secondary',
    size,
    type = 'button',
    disabled,
    className,
    ...rest
}: {
    children: ReactNode
    tone?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm'
    type?: 'button' | 'submit'
    disabled?: boolean
    className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type={type}
            data-tone={tone}
            data-size={size}
            disabled={disabled}
            className={cn('p-btn', className)}
            {...rest}
        >
            {children}
        </button>
    )
}

/**
 * Label above input, helper below, error below that.
 *
 * Placeholders are never used as labels: they vanish on focus, which is
 * exactly when someone re-reads the field.
 */
export function Field({
    label,
    name,
    children,
    hint,
    error,
    htmlFor,
}: {
    label: string
    name?: string
    children: ReactNode
    hint?: string
    error?: string | null
    htmlFor?: string
}) {
    const id = htmlFor ?? name
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-[12.5px] font-medium text-[var(--p-ink-2)]">
                {label}
            </label>
            {children}
            {hint && !error ? <p className="text-[11.5px] text-[var(--p-ink-3)]">{hint}</p> : null}
            {error ? (
                <p className="text-[11.5px] font-medium text-[var(--p-danger-ink)]" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    )
}

/**
 * Empty state.
 *
 * Always says how to populate the thing, never just "no data" - an operator
 * seeing an empty table needs to know whether that is a problem.
 */
export function EmptyState({
    title,
    description,
    action,
}: {
    title: string
    description: string
    action?: ReactNode
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-11 text-center">
            <p className="text-[13.5px] font-semibold text-[var(--p-ink-2)]">{title}</p>
            <p className="max-w-[46ch] text-[12.5px] leading-[1.55] text-[var(--p-ink-3)]">{description}</p>
            {action ? <div className="mt-1.5">{action}</div> : null}
        </div>
    )
}

/** Loading placeholder shaped like the rows it stands in for. */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="flex flex-col gap-px" aria-hidden="true">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-4 px-3.5 py-2.5">
                    {Array.from({ length: columns }).map((_, columnIndex) => (
                        <div
                            key={columnIndex}
                            className="p-skeleton h-3.5"
                            style={{ width: columnIndex === 0 ? '30%' : `${14 + ((columnIndex * 7) % 12)}%` }}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

/* ── table ────────────────────────────────────────────────────────────── */

export function TableShell({
    children,
    className,
    minWidth = 560,
    dense,
}: {
    children: ReactNode
    className?: string
    /**
     * Width the table refuses to go below, in px, or 'content' to let the
     * columns decide.
     *
     * The wrapper has always owned horizontal overflow, but nothing ever
     * overflowed: `.platform-portal table` sets `width: 100%`, so on a narrow
     * screen the table dutifully shrank to fit and squeezed eight columns into
     * 380px instead of scrolling. A floor makes the overflow real, and the
     * scroll stays inside the panel rather than moving the page sideways.
     *
     * Pass a value roughly matching the column count; 'content' suits a table
     * whose column count is driven by data, like the flag matrix.
     */
    minWidth?: number | 'content'
    /**
     * Trades cell gutter for column count.
     *
     * The default 14px side padding spends 28px per column on nothing, which
     * a four-column table inside the 1fr half of a detail page cannot afford:
     * the feature matrix was overflowing its panel on a desktop, not just a
     * phone. 10px still separates the columns without the table reaching for
     * width it does not have.
     */
    dense?: boolean
}) {
    return (
        // `relative` is load-bearing, not decoration. Without it the table's
        // width still reached the document's scrollable overflow even though
        // this element clips and scrolls correctly, so the page itself gained
        // a horizontal scrollbar and the background stopped short of the right
        // edge on a phone. Positioning the scroller keeps the overflow its own
        // business. Measured on the real page at 390px: 492px of page scroll
        // before, 386 after, with the table still scrolling inside.
        <div
            className={cn('relative overflow-x-auto', className)}
            // The floor is handed down as a custom property on the wrapper
            // rather than set as min-width on the table itself, and the
            // difference is load-bearing. An inline style beats a stylesheet
            // on the same element no matter what the media query says, so a
            // floor written onto the table could never be relaxed for one
            // viewport range. Declared here it merely inherits, and a rule on
            // the table wins over inheritance without needing !important.
            style={
                {
                    '--p-table-min': minWidth === 'content' ? 'max-content' : `${minWidth}px`,
                } as CSSProperties
            }
        >
            <table
                // Padding travels as a data attribute rather than a utility
                // class for the usual reason: platform.css is unlayered, so
                // its `.platform-portal td` padding outranks any Tailwind
                // `px-*` put here and would silently drop it.
                data-dense={dense ? 'true' : undefined}
            >
                {children}
            </table>
        </div>
    )
}

export function Th({
    children,
    align = 'left',
    className,
    hideInSqueeze,
}: {
    children: ReactNode
    align?: 'left' | 'right' | 'center'
    className?: string
    /** See the note on Td. Set it on the header and every cell of a column. */
    hideInSqueeze?: boolean
}) {
    return (
        <th
            scope="col"
            data-squeeze-hide={hideInSqueeze ? 'true' : undefined}
            // Alignment travels as a data attribute, not a utility class: the
            // portal's base `th` rule outranks a lone utility and would swallow
            // it. See the matching rules in platform.css.
            data-align={align === 'left' ? undefined : align}
            className={cn(
                'p-label border-b border-[var(--p-line)] bg-[var(--p-surface-2)]',
                className,
            )}
        >
            {children}
        </th>
    )
}

export function Td({
    children,
    align = 'left',
    numeric,
    className,
    hideInSqueeze,
}: {
    children: ReactNode
    align?: 'left' | 'right' | 'center'
    numeric?: boolean
    className?: string
    /**
     * Drops this cell in the detail grid's narrowest window. Marks a column
     * the table can give up before it gives up on fitting; see the media
     * query in platform.css for the arithmetic and the range.
     *
     * A table column is all-or-nothing, so this has to be set on the header
     * and on every body cell of the same column or the rows go out of step.
     */
    hideInSqueeze?: boolean
}) {
    return (
        <td
            data-squeeze-hide={hideInSqueeze ? 'true' : undefined}
            className={cn(
                'border-b border-[var(--p-line-soft)] text-[13px] text-[var(--p-ink-2)]',
                align === 'right' && 'text-right',
                align === 'center' && 'text-center',
                numeric && 'p-num',
                className,
            )}
        >
            {children}
        </td>
    )
}

/* ── pagination ───────────────────────────────────────────────────────── */

/**
 * Which page numbers to draw: always the first and last, always the current
 * and its neighbours, with a gap marker standing in for whatever that skips.
 * Keeps the pager one line wide at 3 pages and at 300.
 */
export function pageWindow(current: number, total: number): Array<number | 'gap'> {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

    const pages = new Set([1, total, current, current - 1, current + 1])
    // Anchor the ends so the row does not change width as the current page
    // walks past the second or second-to-last position.
    if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page))
    if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((page) => pages.add(page))

    const shown = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)

    return shown.flatMap((page, index) => {
        if (index === 0) return [page]

        const skipped = page - shown[index - 1] - 1
        if (skipped === 0) return [page]
        // A gap hiding a single page takes as much room as the page would and
        // tells you less, so draw the page instead.
        if (skipped === 1) return [page - 1, page]
        return ['gap' as const, page]
    })
}

/**
 * Prev / numbered / Next row for the foot of a table.
 *
 * Two shapes, because paging means two different things on this portal.
 * Pass `href` when a page is a URL - the server re-queries and the browser
 * gets a real link to open in a new tab. Pass `onSelect` when the rows are
 * already in memory and a page is just a slice of them. Never draws when
 * there is only one page: a "Page 1 of 1" is noise under a short table.
 */
export function Pager({
    page,
    pageCount,
    label,
    href,
    onSelect,
}: {
    page: number
    pageCount: number
    /** Accessible name for the nav, e.g. "Audit log pages". */
    label: string
    href?: (page: number) => string
    onSelect?: (page: number) => void
}) {
    if (pageCount <= 1) return null

    // In link mode this may be rendered by a server component, where a native
    // element cannot carry an event handler, so onClick is only ever attached
    // when there is an onSelect to call.
    const step = (target: number, text: string) => {
        const disabled = target < 1 || target > pageCount
        if (href && !disabled) {
            return (
                <Link href={href(target)} className="p-page">
                    {text}
                </Link>
            )
        }
        return (
            <button
                type="button"
                className="p-page"
                onClick={onSelect ? () => onSelect(target) : undefined}
                disabled={disabled}
            >
                {text}
            </button>
        )
    }

    return (
        <nav
            aria-label={label}
            className="flex flex-col items-center justify-between gap-2 border-t border-[var(--p-line-soft)] px-3 py-2.5 sm:flex-row"
        >
            <p className="text-[11.5px] text-[var(--p-ink-3)]">
                Page <span className="p-num">{page}</span> of <span className="p-num">{pageCount}</span>
            </p>

            {/* Wraps rather than overflows: Prev, Next and up to seven numbers
                do not fit on one line at 360px. */}
            <div className="flex flex-wrap items-center justify-center gap-1">
                {step(page - 1, 'Prev')}

                {pageWindow(page, pageCount).map((entry, index) => {
                    if (entry === 'gap') {
                        return (
                            <span key={`gap-${index}`} aria-hidden="true" className="p-page-gap">
                                ...
                            </span>
                        )
                    }
                    const current = entry === page
                    if (href && !current) {
                        return (
                            <Link key={entry} href={href(entry)} className="p-page" aria-label={`Page ${entry}`}>
                                {entry}
                            </Link>
                        )
                    }
                    return (
                        <button
                            key={entry}
                            type="button"
                            className="p-page"
                            aria-label={`Page ${entry}`}
                            aria-current={current ? 'page' : undefined}
                            onClick={onSelect ? () => onSelect(entry) : undefined}
                        >
                            {entry}
                        </button>
                    )
                })}

                {step(page + 1, 'Next')}
            </div>
        </nav>
    )
}

/* ── charts ───────────────────────────────────────────────────────────── */

/**
 * Inline area sparkline.
 *
 * Hand-drawn SVG rather than a chart library: this renders inside a Server
 * Component, has no axes, tooltips or interaction, and shipping a charting
 * runtime to draw one polyline would cost more than it returns. Recharts is
 * used for the real, interactive charts.
 */
export function Sparkline({
    points,
    label,
    height = 40,
}: {
    points: number[]
    label: string
    height?: number
}) {
    const width = 220
    const max = Math.max(...points, 1)
    const step = points.length > 1 ? width / (points.length - 1) : width

    const coords = points.map((value, index) => {
        const x = index * step
        // 2px inset top and bottom so the stroke is never clipped by the
        // viewBox at a peak or a zero.
        const y = height - 2 - (value / max) * (height - 4)
        return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    const line = coords.join(' ')
    const area = `0,${height} ${line} ${width},${height}`
    const isFlat = points.every((value) => value === 0)

    if (isFlat) {
        return (
            <div
                className="flex items-center text-[11.5px] text-[var(--p-ink-3)]"
                style={{ height }}
                role="img"
                aria-label={`${label}: no activity`}
            >
                No activity in this window
            </div>
        )
    }

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height }}
            role="img"
            aria-label={label}
        >
            <polygon points={area} fill="var(--p-accent)" opacity="0.1" />
            <polyline
                points={line}
                fill="none"
                stroke="var(--p-accent)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}

/* ── formatting ───────────────────────────────────────────────────────── */

const INR = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
    return INR.format(Math.round(value))
}

/** Compact form for headline tiles, where the exact rupee is noise. */
export function formatCurrencyCompact(value: number): string {
    if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)}L`
    if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`
    return `₹${Math.round(value)}`
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatRelative(value: string | null | undefined): string {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'

    const diff = Date.now() - date.getTime()
    const minutes = Math.round(diff / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.round(hours / 24)
    if (days < 30) return `${days}d ago`

    return formatDate(value)
}

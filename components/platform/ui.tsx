import type { ReactNode } from 'react'
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
    description?: string
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

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
    // The wrapper owns horizontal overflow so a wide table scrolls inside its
    // own panel instead of pushing the page sideways.
    return (
        <div className={cn('overflow-x-auto', className)}>
            <table>{children}</table>
        </div>
    )
}

export function Th({
    children,
    align = 'left',
    className,
}: {
    children: ReactNode
    align?: 'left' | 'right'
    className?: string
}) {
    return (
        <th
            scope="col"
            className={cn(
                'p-label border-b border-[var(--p-line)] bg-[var(--p-surface-2)]',
                align === 'right' && 'text-right',
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
}: {
    children: ReactNode
    align?: 'left' | 'right'
    numeric?: boolean
    className?: string
}) {
    return (
        <td
            className={cn(
                'border-b border-[var(--p-line-soft)] text-[13px] text-[var(--p-ink-2)]',
                align === 'right' && 'text-right',
                numeric && 'p-num',
                className,
            )}
        >
            {children}
        </td>
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

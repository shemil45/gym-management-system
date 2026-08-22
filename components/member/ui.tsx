import Link from 'next/link'
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { IconChevronRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { BackLink } from '@/components/member/MemberChrome'

/*
  Member portal primitives.

  Mobile constraints baked in here rather than repeated per screen:
  - every interactive row/control is at least 44px tall
  - gutters are 20px at mobile so a 320px viewport still has readable measure
  - one radius system (shell 24 / core 18 / control 14 / pill full)
  - one accent, referenced only through --m-accent* tokens
*/

/* ------------------------------------------------------------------ page */

export function Screen({
    title,
    children,
    className,
}: {
    title?: string
    children: ReactNode
    className?: string
}) {
    return (
        <div className={cn('mx-auto w-full max-w-[720px] px-5 lg:max-w-none lg:px-0', className)}>
            {/* The page names itself here at every width. The headers carry only
                brand and utility controls, so this is the sole page heading. */}
            {title ? (
                <div className="mb-4 flex items-center gap-1 lg:mb-6">
                    <BackLink />
                    <h1 className="min-w-0 text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
                        {title}
                    </h1>
                </div>
            ) : null}
            {children}
        </div>
    )
}

export function Stack({ children, gap = 14 }: { children: ReactNode; gap?: number }) {
    return (
        <div className="flex flex-col" style={{ gap }}>
            {children}
        </div>
    )
}

export function SectionHeading({
    children,
    action,
}: {
    children: ReactNode
    action?: { label: string; href: string }
}) {
    return (
        <div className="flex min-h-7 items-center justify-between gap-3 px-1 mt-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{children}</h2>
            {action ? (
                <Link
                    href={action.href}
                    className="m-tap -mr-2 flex h-11 items-center gap-0.5 rounded-full px-2 text-[13px] font-medium text-[var(--m-ink-2)]"
                >
                    {action.label}
                    <IconChevronRight size={15} stroke={2} />
                </Link>
            ) : null}
        </div>
    )
}

/* --------------------------------------------------------------- surfaces */

export function Card({
    children,
    className,
    as: Tag = 'div',
    ...rest
}: { children: ReactNode; className?: string; as?: ElementType } & Record<string, unknown>) {
    return (
        <Tag className={cn('m-card', className)} {...rest}>
            {children}
        </Tag>
    )
}

/** Double-bezel container: machined outer tray holding an inner plate. */
export function Bezel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('m-shell', className)}>
            <div className="m-core h-full">{children}</div>
        </div>
    )
}

/* ---------------------------------------------------------------- controls */

type ButtonTone = 'primary' | 'accent' | 'quiet' | 'danger'

const TONE_CLASS: Record<ButtonTone, string> = {
    primary: 'bg-[var(--m-ink)] text-[var(--m-bg)] border-transparent',
    accent: 'bg-[var(--m-accent)] text-[var(--m-accent-ink)] border-transparent',
    quiet: 'bg-[var(--m-surface)] text-[var(--m-ink)] border-[var(--m-line)]',
    danger: 'bg-[var(--m-danger-wash)] text-[var(--m-danger)] border-transparent',
}

export function Button({
    tone = 'primary',
    size = 'md',
    full,
    trailingIcon,
    leadingIcon,
    className,
    children,
    ...rest
}: {
    tone?: ButtonTone
    size?: 'sm' | 'md' | 'lg'
    full?: boolean
    trailingIcon?: ReactNode
    leadingIcon?: ReactNode
} & ComponentPropsWithoutRef<'button'>) {
    return (
        <button
            className={cn(
                'm-tap group inline-flex items-center justify-center gap-2 rounded-full border font-semibold tracking-[-0.01em]',
                size === 'sm' && 'h-11 px-4 text-[13px]',
                size === 'md' && 'h-12 px-5 text-[14px]',
                size === 'lg' && 'h-14 px-6 text-[15px]',
                full && 'w-full',
                TONE_CLASS[tone],
                'disabled:opacity-45',
                className,
            )}
            {...rest}
        >
            {leadingIcon}
            <span>{children}</span>
            {trailingIcon ? (
                <span
                    className={cn(
                        'ml-0.5 flex items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-active:translate-x-0.5',
                        size === 'lg' ? 'h-8 w-8' : 'h-7 w-7',
                        tone === 'primary' || tone === 'accent'
                            ? 'bg-black/12 dark:bg-white/12'
                            : 'bg-[var(--m-surface-2)]',
                    )}
                >
                    {trailingIcon}
                </span>
            ) : null}
        </button>
    )
}

export function LinkButton({
    href,
    tone = 'primary',
    size = 'md',
    full,
    trailingIcon,
    leadingIcon,
    className,
    children,
}: {
    href: string
    tone?: ButtonTone
    size?: 'sm' | 'md' | 'lg'
    full?: boolean
    trailingIcon?: ReactNode
    leadingIcon?: ReactNode
    className?: string
    children: ReactNode
}) {
    return (
        <Link
            href={href}
            className={cn(
                'm-tap group inline-flex items-center justify-center gap-2 rounded-full border font-semibold tracking-[-0.01em]',
                size === 'sm' && 'h-11 px-4 text-[13px]',
                size === 'md' && 'h-12 px-5 text-[14px]',
                size === 'lg' && 'h-14 px-6 text-[15px]',
                full && 'w-full',
                TONE_CLASS[tone],
                className,
            )}
        >
            {leadingIcon}
            <span>{children}</span>
            {trailingIcon ? (
                <span
                    className={cn(
                        'ml-0.5 flex items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-active:translate-x-0.5',
                        size === 'lg' ? 'h-8 w-8' : 'h-7 w-7',
                        tone === 'primary' || tone === 'accent'
                            ? 'bg-black/12 dark:bg-white/12'
                            : 'bg-[var(--m-surface-2)]',
                    )}
                >
                    {trailingIcon}
                </span>
            ) : null}
        </Link>
    )
}

/* ------------------------------------------------------------------- data */

export function StatTile({
    label,
    value,
    unit,
    icon,
    emphasis,
}: {
    label: string
    value: string | number
    unit?: string
    icon?: ReactNode
    emphasis?: boolean
}) {
    return (
        <div
            className={cn(
                'm-card flex min-h-[92px] flex-col justify-between p-3.5',
                emphasis && 'border-transparent bg-[var(--m-accent-wash)]',
            )}
        >
            <div className="flex items-center gap-1.5 text-[var(--m-ink-3)]">
                {icon}
                <span className="text-[11.5px] font-medium leading-tight text-[var(--m-ink-2)]">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="m-num text-[26px] font-semibold leading-none">{value}</span>
                {unit ? (
                    <span className="text-[12px] font-medium text-[var(--m-ink-3)]">{unit}</span>
                ) : null}
            </div>
        </div>
    )
}

export function Row({
    href,
    icon,
    label,
    value,
    hint,
    onClick,
    tone,
}: {
    href?: string
    icon?: ReactNode
    label: string
    value?: ReactNode
    hint?: string
    onClick?: () => void
    tone?: 'danger'
}) {
    const body = (
        <>
            {icon ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--m-surface-2)] text-[var(--m-ink-2)]">
                    {icon}
                </span>
            ) : null}
            <span className="min-w-0 flex-1">
                <span
                    className={cn(
                        'block truncate text-[14.5px] font-medium',
                        tone === 'danger' && 'text-[var(--m-danger)]',
                    )}
                >
                    {label}
                </span>
                {hint ? (
                    <span className="mt-0.5 block truncate text-[12.5px] text-[var(--m-ink-3)]">
                        {hint}
                    </span>
                ) : null}
            </span>
            {value ? (
                <span className="shrink-0 text-[13.5px] text-[var(--m-ink-2)]">{value}</span>
            ) : null}
            {href || onClick ? (
                <IconChevronRight
                    size={17}
                    stroke={1.8}
                    className="shrink-0 text-[var(--m-ink-3)]"
                />
            ) : null}
        </>
    )

    const shared = 'm-tap flex min-h-[56px] w-full items-center gap-3 px-4 text-left'

    if (href) {
        return (
            <Link href={href} className={shared}>
                {body}
            </Link>
        )
    }
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={shared}>
                {body}
            </button>
        )
    }
    return <div className={shared}>{body}</div>
}

export function RowGroup({ children }: { children: ReactNode }) {
    return <Card className="m-divide overflow-hidden py-0">{children}</Card>
}

export function Pill({
    children,
    tone = 'neutral',
}: {
    children: ReactNode
    tone?: 'neutral' | 'accent' | 'warn' | 'danger'
}) {
    return (
        <span
            className={cn(
                'inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold tracking-[-0.005em]',
                tone === 'neutral' && 'bg-[var(--m-surface-2)] text-[var(--m-ink-2)]',
                tone === 'accent' && 'bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]',
                tone === 'warn' && 'bg-[var(--m-warn-wash)] text-[var(--m-warn-ink)]',
                tone === 'danger' && 'bg-[var(--m-danger-wash)] text-[var(--m-danger)]',
            )}
        >
            {children}
        </span>
    )
}

/* ----------------------------------------------------------------- states */

export function EmptyState({
    icon,
    title,
    body,
    action,
}: {
    icon: ReactNode
    title: string
    body: string
    action?: ReactNode
}) {
    return (
        <Card className="flex flex-col items-center px-6 py-10 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--m-surface-2)] text-[var(--m-ink-3)]">
                {icon}
            </span>
            <p className="text-[15.5px] font-semibold tracking-[-0.01em]">{title}</p>
            <p className="mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                {body}
            </p>
            {action ? <div className="mt-5">{action}</div> : null}
        </Card>
    )
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('m-skeleton rounded-[14px]', className)} />
}

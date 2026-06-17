import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export function PlatformShellCard({
    className,
    children,
}: {
    className?: string
    children: ReactNode
}) {
    return (
        <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
            {children}
        </section>
    )
}

export function PlatformCardHeader({
    eyebrow,
    title,
    description,
    action,
}: {
    eyebrow?: string
    title: string
    description?: string
    action?: ReactNode
}) {
    return (
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p> : null}
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
                {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    )
}

export function PlatformMetricCard({
    label,
    value,
    hint,
    tone = 'default',
}: {
    label: string
    value: string
    hint?: string
    tone?: 'default' | 'positive' | 'warning' | 'critical'
}) {
    const toneClassName = {
        default: 'bg-white',
        positive: 'bg-emerald-50',
        warning: 'bg-amber-50',
        critical: 'bg-rose-50',
    }[tone]

    return (
        <div className={cn('rounded-lg border border-slate-200 p-4', toneClassName)}>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
            {hint ? <p className="mt-2 text-sm text-slate-600">{hint}</p> : null}
        </div>
    )
}

export function PlatformBadge({
    children,
    tone = 'neutral',
}: {
    children: ReactNode
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
}) {
    const toneClassName = {
        neutral: 'border-slate-200 bg-slate-100 text-slate-700',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-700',
        danger: 'border-rose-200 bg-rose-50 text-rose-700',
        info: 'border-sky-200 bg-sky-50 text-sky-700',
        accent: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    }[tone]

    return (
        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', toneClassName)}>
            {children}
        </span>
    )
}

export function PlatformInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn('h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100', props.className)} />
}

export function PlatformSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={cn('h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100', props.className)} />
}

export function PlatformTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={cn('w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100', props.className)} />
}

export function PlatformButton({
    className,
    tone = 'primary',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: 'primary' | 'secondary' | 'ghost'
}) {
    const toneClassName = {
        primary: 'border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500',
        secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
        ghost: 'border border-transparent bg-transparent text-indigo-700 hover:bg-indigo-50',
    }[tone]

    return <button {...props} className={cn('inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition', toneClassName, className)} />
}

export function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            {message}
        </div>
    )
}

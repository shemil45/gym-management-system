import DeltaBadge from '@/components/reports/DeltaBadge'

export type KpiDelta = {
    current: number
    previous: number
    /** Up is bad (expenses, churn, memberships ended). */
    invert?: boolean
    /** Comparison label, e.g. `vs prev` / `vs last year`. */
    suffix?: string
}

export type KpiCardProps = {
    label: string
    /** Primary value, already formatted by the caller. */
    value: string
    /** Optional trailing value shown smaller beside the primary one. */
    secondary?: string
    /** Comparison against another period. Omit and pass `note` when there is no basis. */
    delta?: KpiDelta
    /** Muted line shown where the delta would be — `—`, `as of today`, … */
    note?: string
    /** Colours the value. `default` keeps the normal ink. */
    tone?: 'default' | 'positive' | 'negative'
    icon?: React.ReactNode
    /** One short clarifying line under the value. */
    description?: string
}

const TONE: Record<NonNullable<KpiCardProps['tone']>, string> = {
    default: 'text-gray-900 dark:text-white',
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
}

/**
 * The single KPI card for every report area. Replaces the six near-identical
 * copies that previously lived in payments/, expenses/, members/, attendance/
 * and referrals/ — the markup, spacing and delta colouring are unchanged, so
 * refactoring a KPI row onto this component is visually a no-op.
 */
export default function KpiCard({ label, value, secondary, delta, note, tone = 'default', icon, description }: KpiCardProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900 print:break-inside-avoid">
            <dt className={`text-xs font-medium text-gray-500 dark:text-neutral-400${icon ? ' flex items-center gap-1.5' : ''}`}>
                {icon ? <span className="text-gray-400 dark:text-neutral-500" aria-hidden="true">{icon}</span> : null}
                {label}
            </dt>
            <dd className={`mt-1 text-xl font-semibold tabular-nums ${TONE[tone]}`}>
                {value}
                {secondary ? <span className="ml-1.5 text-sm font-medium text-gray-500 dark:text-neutral-400">{secondary}</span> : null}
            </dd>
            {description ? <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">{description}</p> : null}
            {delta || note ? (
                <div className="mt-1">
                    {delta
                        ? <DeltaBadge current={delta.current} previous={delta.previous} invert={delta.invert} suffix={delta.suffix} />
                        : <span className="text-xs text-gray-400 dark:text-neutral-500">{note}</span>}
                </div>
            ) : null}
        </div>
    )
}

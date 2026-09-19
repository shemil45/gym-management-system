import { deltaPercent } from '@/lib/reports/payments-aggregate'

type Props = { current: number; previous: number; invert?: boolean; suffix?: string }

/** Δ% vs the previous period. `invert` flips the colouring for cost metrics (up = bad). */
export default function DeltaBadge({ current, previous, invert = false, suffix = 'vs prev' }: Props) {
    const delta = deltaPercent(current, previous)
    const suffixText = suffix ? ` ${suffix}` : ''
    if (delta === null) return <span className="text-xs text-gray-400 dark:text-neutral-500">—{suffixText}</span>
    const up = delta >= 0
    const good = up !== invert
    return (
        <span className={`text-xs font-medium tabular-nums ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {up ? '+' : ''}{delta.toFixed(1)}%{suffixText}
        </span>
    )
}

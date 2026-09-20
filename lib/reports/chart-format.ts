import { formatCurrency } from '@/lib/utils/currency'

/**
 * How a chart renders a number. Reports deal in three kinds: money (₹, Indian
 * grouping), plain counts, and already-computed percentages. Axis ticks use a
 * shortened form so a ₹1,25,000 label does not eat a third of the plot.
 */
export type ValueFormat = 'currency' | 'number' | 'percent'

const NUMBER = new Intl.NumberFormat('en-IN')
const DECIMAL = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 })

/** Full-precision value for tooltips, legends and table-adjacent labels. */
export function formatValue(value: number | null | undefined, format: ValueFormat = 'number'): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—'
    switch (format) {
        case 'currency': return formatCurrency(value)
        case 'percent': return `${DECIMAL.format(value)}%`
        case 'number': return Number.isInteger(value) ? NUMBER.format(value) : DECIMAL.format(value)
    }
}

/**
 * Shortened value for axis ticks. Uses the Indian lakh/crore scale rather than
 * K/M, because that is how the rest of the app reads amounts back to a gym.
 */
export function formatAxisValue(value: number, format: ValueFormat = 'number'): string {
    if (!Number.isFinite(value)) return ''
    if (format === 'percent') return `${DECIMAL.format(value)}%`

    const prefix = format === 'currency' ? '₹' : ''
    const abs = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    if (abs >= 10_000_000) return `${sign}${prefix}${DECIMAL.format(abs / 10_000_000)}Cr`
    if (abs >= 100_000) return `${sign}${prefix}${DECIMAL.format(abs / 100_000)}L`
    if (abs >= 1_000) return `${sign}${prefix}${DECIMAL.format(abs / 1_000)}k`
    return `${sign}${prefix}${Number.isInteger(abs) ? NUMBER.format(abs) : DECIMAL.format(abs)}`
}

/** `12.4%` share of a total, or `—` when the total is zero. */
export function formatShare(value: number, total: number): string {
    if (!total) return '—'
    return `${DECIMAL.format((value / total) * 100)}%`
}

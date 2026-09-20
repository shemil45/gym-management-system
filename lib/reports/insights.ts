import { deltaPercent } from '@/lib/reports/payments-aggregate'
import { formatValue, type ValueFormat } from '@/lib/reports/chart-format'

/**
 * Sentence builders for <InsightBar>. Every one of these states a fact that
 * the aggregates already computed — no interpretation, no cause, no forecast.
 * If a sentence cannot be stated truthfully (no comparison basis, no data),
 * the builder returns null and the caller renders nothing.
 *
 * Report modules own the choice of *which* insight to show; this module only
 * owns the wording.
 */

export type Insight = { text: string; tone: 'neutral' | 'positive' | 'negative' }

/**
 * "Revenue increased 12.4% compared with the previous period."
 *
 * `invert` marks a metric where up is bad (expenses, churn) so the tone, not
 * the wording, flips. Null when the comparison period is zero — the same
 * guard `deltaPercent` applies, because a percentage change from nothing is
 * not a fact.
 */
export function changeInsight(
    metric: string,
    current: number,
    previous: number,
    options: { basis?: string; invert?: boolean } = {},
): Insight | null {
    const { basis = 'the previous period', invert = false } = options
    const delta = deltaPercent(current, previous)
    if (delta === null) return null
    if (Math.abs(delta) < 0.05) return { text: `${metric} was unchanged compared with ${basis}.`, tone: 'neutral' }
    const up = delta > 0
    const direction = up ? 'increased' : 'decreased'
    return {
        text: `${metric} ${direction} ${Math.abs(delta).toFixed(1)}% compared with ${basis}.`,
        tone: up !== invert ? 'positive' : 'negative',
    }
}

/**
 * "Saturday had the highest attendance in this period — 312 check-ins."
 * Null when there is nothing to rank.
 */
export function peakInsight(
    subject: string,
    peak: { label: string; value: number } | null,
    unit: string,
    format: ValueFormat = 'number',
): Insight | null {
    if (!peak || peak.value <= 0) return null
    return { text: `${peak.label} had the highest ${subject} in this period — ${formatValue(peak.value, format)} ${unit}.`, tone: 'neutral' }
}

/**
 * "3 payment attempts failed." Null at zero, so a clean period shows no
 * warning rather than "0 payment attempts failed".
 */
export function countInsight(
    count: number,
    singular: string,
    plural: string,
    tone: Insight['tone'] = 'neutral',
): Insight | null {
    if (count <= 0) return null
    return { text: `${count} ${count === 1 ? singular : plural}.`, tone }
}

/**
 * "Cash accounted for 62.1% of collections." Null when the total is zero or
 * the leader has no value.
 */
export function shareInsight(leader: { label: string; value: number } | null, total: number, of: string): Insight | null {
    if (!leader || leader.value <= 0 || total <= 0) return null
    return { text: `${leader.label} accounted for ${((leader.value / total) * 100).toFixed(1)}% of ${of}.`, tone: 'neutral' }
}

/** First non-null insight, for a bar that shows exactly one line. */
export function firstInsight(...candidates: (Insight | null)[]): Insight | null {
    return candidates.find((insight): insight is Insight => insight !== null) ?? null
}

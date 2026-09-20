import { Info, TrendingDown, TrendingUp } from 'lucide-react'
import type { Insight } from '@/lib/reports/insights'

const TONE = {
    neutral: { icon: Info, className: 'text-gray-500 dark:text-neutral-400' },
    positive: { icon: TrendingUp, className: 'text-emerald-600 dark:text-emerald-400' },
    negative: { icon: TrendingDown, className: 'text-rose-600 dark:text-rose-400' },
} as const

/**
 * One computed observation, sitting between a chart and its table.
 *
 * This component renders text and nothing else — it does no analysis. The
 * sentence is built by the report's own aggregation layer (see
 * lib/reports/insights.ts), which states only what the numbers already say:
 * no causes, no predictions, no AI.
 *
 * Renders nothing when there is no insight, so a caller can pass the result of
 * an insight builder straight through.
 */
export default function InsightBar({ insight }: { insight: Insight | null }) {
    if (!insight) return null
    const { icon: Icon, className } = TONE[insight.tone]
    return (
        <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-sm text-gray-700 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-300 print:break-inside-avoid">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} aria-hidden="true" />
            <span className="text-pretty">{insight.text}</span>
        </p>
    )
}

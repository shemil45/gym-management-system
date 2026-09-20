'use client'

import { useSearchParams } from 'next/navigation'
import { useReportNavigation } from '@/components/reports/ReportNavigation'
import { COMPARISON_PARAM, COMPARISONS, DEFAULT_COMPARISON, type Comparison } from '@/lib/reports/comparison'

type Props = {
    value: Comparison
    basePath: string
    /**
     * Whether "Last year" is offered. The caller decides from data it already
     * holds (see `lastYearIsAvailable`) — this control never queries, and
     * hiding the option is better than offering an empty comparison.
     */
    allowLastYear?: boolean
}

/**
 * Chooses what a report compares against. Ranges themselves come from the
 * existing date utilities (`previousRange`, `sameRangeLastYear`) — nothing new
 * is calculated here.
 *
 * Navigation patches the current URL rather than rebuilding it, exactly as
 * PeriodPicker does, so every existing parameter (tab, preset, from/to,
 * horizon, days, status …) survives a comparison change untouched.
 */
export default function ComparisonControl({ value, basePath, allowLastYear = false }: Props) {
    const { navigate } = useReportNavigation()
    const searchParams = useSearchParams()

    const options = COMPARISONS.filter((option) => option.id !== 'last-year' || allowLastYear)

    const go = (comparison: Comparison) => {
        const params = new URLSearchParams(searchParams.toString())
        // The default stays out of the URL so existing links keep their shape.
        if (comparison === DEFAULT_COMPARISON) params.delete(COMPARISON_PARAM)
        else params.set(COMPARISON_PARAM, comparison)
        const query = params.toString()
        navigate(query ? `${basePath}?${query}` : basePath)
    }

    const chip = 'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Compare with">
            {options.map((option) => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => go(option.id)}
                    aria-pressed={value === option.id}
                    className={`${chip} ${value === option.id ? on : off}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

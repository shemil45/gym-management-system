'use client'

import { seriesColor, useChartPalette } from '@/components/reports/charts/chart-theme'
import type { Funnel } from '@/lib/reports/referrals-aggregate'

/**
 * Created → converted as a progression rather than two bars sharing a
 * total. Created is the starting population and draws at full width;
 * converted is the part of it that applied and draws at its share; the rate
 * is converted ÷ created. All three come from the same `funnel()` figures
 * the KPI row reads, so they cannot disagree.
 *
 * Laid out as a column that fills the card, so it sits level with whatever
 * shares its grid row instead of leaving a gap beneath. The converted bar
 * takes the chart palette's first series colour, like every other first
 * series on the page.
 */
export default function ConversionFunnel({ funnel }: { funnel: Funnel }) {
    const palette = useChartPalette()
    const { created, converted, rate, coinsIssued, bonus } = funnel
    const empty = created === 0

    return (
        <section className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 print:break-inside-avoid print:bg-white">
            <header className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Created → converted</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
                    {empty
                        ? 'Referrals created this period and how many of them converted'
                        : `Each conversion credits ${bonus} coins, so ${coinsIssued} coins were issued — a derived figure, not a reward ledger`}
                </p>
            </header>

            {empty ? (
                <p className="flex flex-1 items-center justify-center py-6 text-sm text-gray-500 dark:text-neutral-400">No referrals created in this period</p>
            ) : (
                <div className="flex flex-1 flex-col justify-center gap-4">
                    <Stage label="Created referrals" value={created} width={100} color={palette.comparison} hint="starting population" />
                    <Stage label="Converted referrals" value={converted} width={Math.min(100, rate ?? 0)} color={seriesColor(palette, 0)} hint={`${rate === null ? '—' : `${rate.toFixed(1)}%`} of created`} />
                    <div className="flex items-baseline justify-between border-t border-gray-100 pt-3 dark:border-neutral-800">
                        <span className="text-xs text-gray-500 dark:text-neutral-400">Conversion rate · converted ÷ created</span>
                        <span className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{rate === null ? '—' : `${rate.toFixed(1)}%`}</span>
                    </div>
                </div>
            )}
        </section>
    )
}

function Stage({ label, value, width, color, hint }: { label: string; value: number; width: number; color: string; hint: string }) {
    return (
        <div>
            <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-gray-700 dark:text-neutral-300">
                    {label}
                    <span className="ml-1.5 text-gray-400 dark:text-neutral-500">{hint}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
        </div>
    )
}

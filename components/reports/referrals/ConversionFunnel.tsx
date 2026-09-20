'use client'

import { seriesColor, useChartPalette } from '@/components/reports/charts/chart-theme'
import type { Funnel } from '@/lib/reports/referrals-aggregate'

/**
 * Links shared → leads submitted → converted, as a progression. A generated
 * link is where a referral *may* start; it only counts as a referral once
 * the friend submits their details (a lead). Referrals recorded at the desk
 * join at the second stage. All figures come from the same `funnel()` the
 * KPI row reads, so they cannot disagree.
 */
export default function ConversionFunnel({ funnel }: { funnel: Funnel }) {
    const palette = useChartPalette()
    const { linksGenerated, created, leads, converted, pending, expired, cancelled, rate, coinsIssued, bonus } = funnel
    const empty = created === 0 && linksGenerated === 0
    const top = Math.max(linksGenerated, created, 1)
    const desk = created - leads

    return (
        <section className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 print:break-inside-avoid print:bg-white">
            <header className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Links → leads → converted</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
                    {empty
                        ? 'Links members generated, leads friends submitted, and how many registered'
                        : `Each conversion credits ${bonus} coins, so ${coinsIssued} coins were issued — a derived figure, not a reward ledger`}
                </p>
            </header>

            {empty ? (
                <p className="flex flex-1 items-center justify-center py-6 text-sm text-gray-500 dark:text-neutral-400">No referral activity in this period</p>
            ) : (
                <div className="flex flex-1 flex-col justify-center gap-4">
                    <Stage label="Links generated" value={linksGenerated} width={(linksGenerated / top) * 100} color={palette.comparison} hint="members who opened their link · not a referral yet" />
                    <Stage
                        label="Referrals started"
                        value={created}
                        width={(created / top) * 100}
                        color={seriesColor(palette, 1)}
                        hint={desk > 0 ? `${leads} leads via link · ${desk} at the desk` : `${leads} leads via link`}
                    />
                    <Stage label="Converted" value={converted} width={(converted / top) * 100} color={seriesColor(palette, 0)} hint={`${rate === null ? '—' : `${rate.toFixed(1)}%`} of started`} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-gray-100 pt-3 dark:border-neutral-800">
                        <span className="text-xs text-gray-500 dark:text-neutral-400">
                            Still open {pending} · expired {expired} · cancelled {cancelled}
                        </span>
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
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, width)}%`, backgroundColor: color }} />
            </div>
        </div>
    )
}

import type { Comparison } from '@/lib/reports/comparison'
import { changeInsight, firstInsight, type Insight } from '@/lib/reports/insights'
import { WEEKDAY_LABELS, formatHourLabel } from '@/lib/reports/attendance-aggregate'
import type { ByMemberReport, FootfallReport, HeatmapReport } from '@/lib/reports/attendance'

/**
 * One sentence per Attendance tab. Every figure is one the report already
 * holds; there is no capacity in the data, so nothing here speaks of
 * utilisation or occupancy — only of how many came, and when.
 */

function basisFor(compare: Comparison): string {
    return compare === 'last-year' ? 'the same period last year' : 'the previous period'
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function footfallInsight(report: FootfallReport): Insight | null {
    if (report.kpis.visits === 0) return null
    const busiest = report.peaks.busiestWeekday
    const frequent = report.frequency.filter((b) => b.id === '4-7' || b.id === '8+').reduce((s, b) => s + b.members, 0)
    return firstInsight(
        report.previous ? changeInsight('Average daily attendance', report.kpis.perDay, report.previous.perDay, { basis: basisFor(report.compare) }) : null,
        busiest && busiest.visits > 0
            ? { text: `${WEEKDAY_LABELS[busiest.weekday]} had the highest recorded attendance — ${busiest.perDay.toFixed(1)} visits per ${WEEKDAY_LABELS[busiest.weekday]}.`, tone: 'neutral' }
            : null,
        frequent > 0 ? { text: `${plural(frequent, 'member', 'members')} visited 4 or more times during this period.`, tone: 'neutral' } : null,
    )
}

export function byMemberInsight(report: ByMemberReport): Insight | null {
    const { summary, segments } = report
    if (summary.members === 0) return null
    const power = segments.find((s) => s.id === 'power')
    return firstInsight(
        summary.gap14 > 0
            ? { text: `${plural(summary.gap14, 'member who visited', 'members who visited')} this period ${summary.gap14 === 1 ? 'has' : 'have'} not been back for 14+ days.`, tone: 'negative' }
            : null,
        power && power.members > 0
            ? { text: `${plural(power.members, 'member averaged', 'members averaged')} 3 or more visits a week during this period.`, tone: 'neutral' }
            : null,
        { text: `${plural(summary.members, 'member', 'members')} visited during this period, averaging ${summary.avgVisits.toFixed(1)} visits each.`, tone: 'neutral' },
    )
}

export function heatmapInsight(report: HeatmapReport): Insight | null {
    const { busiest, peaks } = report
    if (!busiest) return null
    const hour = formatHourLabel(busiest.hour)
    const weekend = peaks.weekendPerDay > peaks.weekdayPerDay
    return {
        text: `Busiest slot was ${WEEKDAY_LABELS[busiest.weekday]} ${hour} with ${plural(busiest.count, 'check-in', 'check-ins')}; ${weekend ? 'weekend' : 'weekday'} days averaged more visits (${Math.max(peaks.weekendPerDay, peaks.weekdayPerDay).toFixed(1)} vs ${Math.min(peaks.weekendPerDay, peaks.weekdayPerDay).toFixed(1)} a day).`,
        tone: 'neutral',
    }
}

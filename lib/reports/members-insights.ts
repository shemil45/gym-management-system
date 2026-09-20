import { formatCurrency } from '@/lib/utils/currency'
import type { Comparison } from '@/lib/reports/comparison'
import { changeInsight, firstInsight, type Insight } from '@/lib/reports/insights'
import type { InactiveReport, JoinsReport, RenewalsReport, RetentionReport, RosterReport } from '@/lib/reports/members'

/**
 * One sentence per Members tab, each a figure the report already holds.
 * The wording keeps the concepts apart: inactive is not churned, expiring is
 * not churned, and membership value is not revenue.
 */

function basisFor(compare: Comparison): string {
    return compare === 'last-year' ? 'the same period last year' : 'the previous period'
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function joinsInsight(report: JoinsReport): Insight | null {
    const { summary } = report
    if (summary.joins === 0) return null
    return firstInsight(
        report.previous ? changeInsight('New joins', summary.joins, report.previous.joins, { basis: basisFor(report.compare) }) : null,
        summary.referral > 0
            ? { text: `Referral joins represented ${summary.referralShare.toFixed(1)}% of ${plural(summary.joins, 'new member', 'new members')}.`, tone: 'neutral' }
            : { text: `${plural(summary.joins, 'new member joined', 'new members joined')} during the selected period, all walk-ins.`, tone: 'neutral' },
    )
}

export function retentionInsight(report: RetentionReport): Insight | null {
    const { totals } = report
    if (totals.retention === null) return null
    return firstInsight(
        report.previous && report.previous.retention !== null
            ? changeInsight('Retention', totals.retention, report.previous.retention, { basis: basisFor(report.compare) })
            : null,
        { text: `Retention was ${totals.retention.toFixed(1)}% for the ${plural(totals.ended, 'membership', 'memberships')} ending in this period.`, tone: 'neutral' },
    )
}

export function rosterInsight(report: RosterReport): Insight | null {
    if (report.value.members === 0) return null
    return {
        text: `Monthly-normalised membership value is ${formatCurrency(report.value.mrr)} across ${plural(report.value.members, 'active membership', 'active memberships')}.`,
        tone: 'neutral',
    }
}

export function renewalsInsight(report: RenewalsReport): Insight | null {
    const { summary } = report
    if (summary.in7 > 0) return { text: `${plural(summary.in7, 'membership expires', 'memberships expire')} in the next 7 days.`, tone: 'neutral' }
    if (summary.in30 > 0) return { text: `${plural(summary.in30, 'membership expires', 'memberships expire')} in the next 30 days; none in the next 7.`, tone: 'neutral' }
    return null
}

export function inactiveInsight(report: InactiveReport): Insight | null {
    const count = report.rows.length
    if (count === 0) return null
    const risk = report.atRisk.length
    const tail = risk > 0 ? ` ${plural(risk, 'of them also expires', 'of them also expire')} within 30 days.` : ''
    return { text: `${plural(count, 'active member has', 'active members have')} not checked in for ${report.days}+ days.${tail}`, tone: risk > 0 ? 'negative' : 'neutral' }
}

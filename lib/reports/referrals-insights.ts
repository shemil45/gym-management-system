import type { Comparison } from '@/lib/reports/comparison'
import { changeInsight, firstInsight, type Insight } from '@/lib/reports/insights'
import type { LeaderboardReport, OverviewReport } from '@/lib/reports/referrals'

/**
 * One sentence per Referrals tab. Every figure is one the report already
 * holds. The wording stays descriptive: no referrer is "best", no rate is
 * "strong", and coins issued is always the derived quantity it is.
 */

function basisFor(compare: Comparison): string {
    return compare === 'last-year' ? 'the same period last year' : 'the previous period'
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function overviewInsight(report: OverviewReport): Insight | null {
    const { totals, previous, timing, joinMix } = report
    const rate = totals.conversion
    const previousRate = previous && previous.referrals ? (previous.conversions / previous.referrals) * 100 : null
    return firstInsight(
        rate !== null && previousRate !== null
            ? { text: `Referral conversion was ${rate.toFixed(1)}% this period, compared with ${previousRate.toFixed(1)}% in ${basisFor(report.compare)}.`, tone: rate >= previousRate ? 'positive' : 'negative' }
            : null,
        rate !== null
            ? { text: `${plural(totals.converted, 'referred member', 'referred members')} converted during this period, from ${plural(totals.created, 'referral', 'referrals')} started.`, tone: 'neutral' }
            : null,
        previous ? changeInsight('Referrals started', totals.created, previous.referrals, { basis: basisFor(report.compare) }) : null,
        timing.medianDays !== null
            ? { text: `Median time to conversion was ${plural(Math.round(timing.medianDays), 'day', 'days')}.`, tone: 'neutral' }
            : null,
        joinMix.share !== null && joinMix.joins > 0
            ? { text: `Referred members accounted for ${joinMix.share.toFixed(1)}% of the ${plural(joinMix.joins, 'new join', 'new joins')} in this period.`, tone: 'neutral' }
            : null,
    )
}

export function leaderboardInsight(report: LeaderboardReport): Insight | null {
    const { totals } = report
    if (totals.referrers === 0) return null
    return {
        text: `${plural(totals.referrers, 'member made', 'members made')} ${plural(totals.referrals, 'referral', 'referrals')} in this period; ${plural(totals.converted, 'has', 'have')} converted so far${totals.conversion !== null ? ` (${totals.conversion.toFixed(1)}%)` : ''}.`,
        tone: 'neutral',
    }
}

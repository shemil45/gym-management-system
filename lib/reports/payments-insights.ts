import { formatCurrency } from '@/lib/utils/currency'
import type { Comparison } from '@/lib/reports/comparison'
import { changeInsight, firstInsight, shareInsight, type Insight } from '@/lib/reports/insights'
import type { PendingReport, PlanReport, StaffReport, SummaryReport } from '@/lib/reports/payments'

/**
 * One sentence per Payments section, each stating a figure the report already
 * holds. Nothing here is interpretive — see lib/reports/insights.ts for the
 * ground rules. Every builder returns null when the sentence cannot be stated
 * truthfully, and the InsightBar renders nothing.
 */

function basisFor(compare: Comparison): string {
    return compare === 'last-year' ? 'the same period last year' : 'the previous period'
}

/** Summary: the collected total against the comparison, else the leading method. */
export function summaryInsight(report: SummaryReport): Insight | null {
    const change = report.previous
        ? changeInsight('Collected revenue', report.kpis.collected, report.previous.collected, { basis: basisFor(report.compare) })
        : null
    const top = report.methods[0] ?? null
    return firstInsight(
        change,
        shareInsight(top ? { label: top.label, value: top.amount } : null, report.kpis.collected, 'collected revenue'),
    )
}

/** Summary, membership split: how much of the period came from renewals. */
export function membershipInsight(report: SummaryReport): Insight | null {
    const renewals = report.membership.find((row) => row.kind === 'renewal')
    if (!renewals || renewals.amount <= 0 || report.kpis.collected <= 0) return null
    return { text: `Renewals contributed ${renewals.share.toFixed(1)}% of collected revenue (${formatCurrency(renewals.amount)}).`, tone: 'neutral' }
}

/** By plan: the leading plan's share, or the total against the comparison. */
export function planInsight(report: PlanReport): Insight | null {
    const top = report.rows[0] ?? null
    return firstInsight(
        shareInsight(top ? { label: top.plan, value: top.revenue } : null, report.total.revenue, 'plan revenue'),
        report.previousTotal
            ? changeInsight('Plan revenue', report.total.revenue, report.previousTotal.revenue, { basis: basisFor(report.compare) })
            : null,
    )
}

/** Pending: what is still outstanding, and how much of it is old. */
export function pendingInsight(report: PendingReport): Insight | null {
    const pending = report.split.pending
    const failed = report.split.failed
    if (pending.length === 0 && failed.length === 0) return null

    const pendingAmount = pending.reduce((s, r) => s + r.amount, 0)
    const failedAmount = failed.reduce((s, r) => s + r.amount, 0)
    const old = report.ageing.find((bucket) => bucket.id === '8+')
    const oldAmount = old ? old.pendingAmount + old.failedAmount : 0

    const parts: string[] = []
    if (pending.length > 0) parts.push(`${formatCurrency(pendingAmount)} remains pending across ${pending.length} payment${pending.length === 1 ? '' : 's'}`)
    if (failed.length > 0) parts.push(`${failed.length} payment${failed.length === 1 ? '' : 's'} failed (${formatCurrency(failedAmount)})`)
    const tail = oldAmount > 0 ? `; ${formatCurrency(oldAmount)} of this is more than 7 days old.` : '.'
    return { text: `${parts.join('; ')}${tail}`, tone: oldAmount > 0 ? 'negative' : 'neutral' }
}

/** By staff: unassigned collections first — it is the actionable figure. */
export function staffInsight(report: StaffReport): Insight | null {
    if (report.unassigned.txns > 0) {
        return {
            text: `${formatCurrency(report.unassigned.amount)} across ${report.unassigned.txns} payment${report.unassigned.txns === 1 ? '' : 's'} has no recorded collector.`,
            tone: 'negative',
        }
    }
    if (report.total.collected <= 0) return null
    return { text: `Cash accounted for ${formatCurrency(report.total.cash)} of ${formatCurrency(report.total.collected)} collected.`, tone: 'neutral' }
}

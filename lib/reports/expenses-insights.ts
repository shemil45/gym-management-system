import type { Comparison } from '@/lib/reports/comparison'
import { changeInsight, firstInsight, shareInsight, type Insight } from '@/lib/reports/insights'
import type { CategoryReport, PnlReport } from '@/lib/reports/expenses'

/**
 * One sentence per Expenses & P&L section. Same ground rules as the payments
 * builders: every sentence is a figure the report already holds, and null
 * means nothing is shown.
 */

function basisFor(compare: Comparison): string {
    return compare === 'last-year' ? 'the same period last year' : 'the previous period'
}

/** Top category share, else the expense-to-revenue ratio. */
function topCategoryInsight(rows: CategoryReport['rows'], total: number): Insight | null {
    const top = rows[0] ?? null
    return shareInsight(top ? { label: top.label, value: top.total } : null, total, 'recorded expenses')
}

/**
 * P&L: expenses against the comparison first — the figure a gym most wants
 * to know changed — then the expense-to-revenue ratio, then the top category.
 */
export function pnlInsight(report: PnlReport): Insight | null {
    return firstInsight(
        report.previous
            ? changeInsight('Expenses', report.kpis.totalExpenses, report.previous.totalExpenses, { basis: basisFor(report.compare), invert: true })
            : null,
        report.expenseRatio !== null
            ? { text: `Expenses represented ${report.expenseRatio.toFixed(1)}% of recorded revenue during this period.`, tone: 'neutral' }
            : null,
        topCategoryInsight(report.categories, report.kpis.totalExpenses),
    )
}

/** By category: the leading category's share, else the total against the comparison. */
export function categoryInsight(report: CategoryReport): Insight | null {
    return firstInsight(
        topCategoryInsight(report.rows, report.total),
        report.previousTotal !== null
            ? changeInsight('Expenses', report.total, report.previousTotal, { basis: basisFor(report.compare), invert: true })
            : null,
    )
}

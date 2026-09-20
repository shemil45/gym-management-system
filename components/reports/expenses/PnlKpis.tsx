import { formatCurrency } from '@/lib/utils/currency'
import { comparisonSuffix } from '@/lib/reports/comparison'
import type { PnlReport } from '@/lib/reports/expenses'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import type { KpiCardProps } from '@/components/reports/kpi/KpiCard'

/**
 * The P&L headline row. Net income / Total expenses / Net keep their original
 * meaning (paid − refunded; sum of expenses; the difference). Margin is the
 * existing `net / netIncome`, unchanged. Expense-to-revenue is
 * `totalExpenses / netIncome` — a ratio, not a score.
 */
export default function PnlKpis({ report }: { report: PnlReport }) {
    const { kpis, previous, totals } = report
    const suffix = comparisonSuffix(report.compare)

    // No comparison period → no delta on any card.
    const delta = (current: number | null, prev: number | null | undefined, invert?: boolean): Pick<KpiCardProps, 'delta'> =>
        current === null || prev === null || prev === undefined ? {} : { delta: { current, previous: prev, invert, suffix } }

    const previousMargin = previous && previous.netIncome !== 0 ? (previous.net / previous.netIncome) * 100 : null

    return (
        <KpiStrip
            columns={5}
            items={[
                { label: 'Net income', value: formatCurrency(kpis.netIncome), description: 'Paid less refunded', ...delta(kpis.netIncome, previous?.netIncome) },
                // Up is bad on the cost line, so the delta colouring is inverted.
                { label: 'Total expenses', value: formatCurrency(kpis.totalExpenses), ...delta(kpis.totalExpenses, previous?.totalExpenses, true) },
                { label: 'Net', value: formatCurrency(kpis.net), tone: kpis.net >= 0 ? 'positive' : 'negative', description: 'Net income less expenses', ...delta(kpis.net, previous?.net) },
                { label: 'Margin', value: totals.margin === null ? '—' : `${totals.margin.toFixed(1)}%`, description: 'Net ÷ net income', ...delta(totals.margin, previousMargin) },
                {
                    label: 'Expense-to-revenue',
                    value: report.expenseRatio === null ? '—' : `${report.expenseRatio.toFixed(1)}%`,
                    description: report.expenseRatio === null ? 'Needs positive net income' : 'Expenses ÷ net income',
                    ...delta(report.expenseRatio, report.previousExpenseRatio, true),
                },
            ]}
        />
    )
}

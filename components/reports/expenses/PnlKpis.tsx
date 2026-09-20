import { formatCurrency } from '@/lib/utils/currency'
import type { PnlKpis as PnlKpisData } from '@/lib/reports/expenses-aggregate'
import KpiStrip from '@/components/reports/kpi/KpiStrip'

export default function PnlKpis({ current, previous }: { current: PnlKpisData; previous: PnlKpisData }) {
    return (
        <KpiStrip
            columns={3}
            items={[
                { label: 'Net income', value: formatCurrency(current.netIncome), delta: { current: current.netIncome, previous: previous.netIncome } },
                // Up is bad on the cost line, so the delta colouring is inverted.
                { label: 'Total expenses', value: formatCurrency(current.totalExpenses), delta: { current: current.totalExpenses, previous: previous.totalExpenses, invert: true } },
                { label: 'Net', value: formatCurrency(current.net), tone: current.net >= 0 ? 'positive' : 'negative', delta: { current: current.net, previous: previous.net } },
            ]}
        />
    )
}

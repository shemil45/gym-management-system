import type { RenewalsReport } from '@/lib/reports/members'
import { renewalsInsight } from '@/lib/reports/members-insights'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

/**
 * The counts behind the Renewals chips, side by side. This tab stays a
 * to-do list — no charts, no comparison — so the summary is four numbers
 * and one sentence above the existing table.
 */
export default function RenewalsSummary({ report }: { report: RenewalsReport }) {
    const { summary } = report
    const active = (id: 'in7' | 'in15' | 'in30' | 'lapsed') =>
        report.mode === 'lapsed' ? id === 'lapsed' : id === `in${report.horizon}`

    return (
        <>
            <KpiStrip
                columns={4}
                items={[
                    { label: 'Expiring in 7 days', value: String(summary.in7), description: active('in7') ? 'Shown below' : undefined },
                    { label: 'Expiring in 15 days', value: String(summary.in15), description: active('in15') ? 'Shown below' : undefined },
                    { label: 'Expiring in 30 days', value: String(summary.in30), description: active('in30') ? 'Shown below' : undefined },
                    { label: 'Lapsed in period', value: String(summary.lapsed), tone: summary.lapsed > 0 ? 'negative' : 'default', description: active('lapsed') ? 'Shown below' : 'Ended in the selected period, not renewed' },
                ]}
            />
            <InsightBar insight={renewalsInsight(report)} />
        </>
    )
}

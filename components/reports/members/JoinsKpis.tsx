import type { JoinKpis as JoinKpisData } from '@/lib/reports/members-aggregate'
import KpiStrip from '@/components/reports/kpi/KpiStrip'

export default function JoinsKpis({ current, previous }: { current: JoinKpisData; previous: JoinKpisData }) {
    return (
        <KpiStrip
            columns={2}
            items={[
                { label: 'New joins', value: String(current.joins), delta: { current: current.joins, previous: previous.joins } },
                { label: 'Referral share', value: `${current.referralShare.toFixed(1)}%`, delta: { current: current.referralShare, previous: previous.referralShare } },
            ]}
        />
    )
}

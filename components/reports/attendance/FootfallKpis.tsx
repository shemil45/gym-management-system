import type { FootfallKpis as FootfallKpisData } from '@/lib/reports/attendance-aggregate'
import KpiStrip from '@/components/reports/kpi/KpiStrip'

export default function FootfallKpis({ current, previous }: { current: FootfallKpisData; previous: FootfallKpisData }) {
    return (
        <KpiStrip
            columns={3}
            items={[
                { label: 'Visits', value: String(current.visits), delta: { current: current.visits, previous: previous.visits } },
                { label: 'Unique members', value: String(current.uniqueMembers), delta: { current: current.uniqueMembers, previous: previous.uniqueMembers } },
                { label: 'Per day', value: current.perDay.toFixed(1), delta: { current: current.perDay, previous: previous.perDay } },
            ]}
        />
    )
}

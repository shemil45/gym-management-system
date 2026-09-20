import type { OverviewKpis as OverviewKpisData } from '@/lib/reports/referrals-aggregate'
import { formatCurrency } from '@/lib/utils/currency'
import KpiStrip from '@/components/reports/kpi/KpiStrip'

export default function OverviewKpis({ current, previous, outstanding }: { current: OverviewKpisData; previous: OverviewKpisData; outstanding: number }) {
    return (
        <KpiStrip
            columns={5}
            items={[
                { label: 'Created', value: String(current.referrals), delta: { current: current.referrals, previous: previous.referrals } },
                { label: 'Conversions', value: String(current.conversions), delta: { current: current.conversions, previous: previous.conversions } },
                { label: 'Coins issued', value: String(current.coinsIssued), delta: { current: current.coinsIssued, previous: previous.coinsIssued } },
                { label: 'Coins redeemed', value: String(current.coinsRedeemed), delta: { current: current.coinsRedeemed, previous: previous.coinsRedeemed } },
                // A balance is a point-in-time figure, not a period total, so it
                // carries no delta.
                { label: 'Outstanding balance', value: `${outstanding} coins · ${formatCurrency(outstanding)}`, note: 'as of today' },
            ]}
        />
    )
}

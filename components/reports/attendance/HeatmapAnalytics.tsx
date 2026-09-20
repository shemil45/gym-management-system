import { WEEKDAY_LABELS, WEEKDAY_SHORT, formatHourLabel } from '@/lib/reports/attendance-aggregate'
import type { HeatmapReport } from '@/lib/reports/attendance'
import { heatmapInsight } from '@/lib/reports/attendance-insights'
import HeatGrid from '@/components/reports/charts/HeatGrid'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

/**
 * The hour × weekday grid on the shared HeatGrid, with the busiest-slot
 * figures above it and one insight below. Cell values are the existing
 * `heatmap()` counts; totals are the same row/column sums the CSV writes.
 */
export default function HeatmapAnalytics({ report }: { report: HeatmapReport }) {
    const { hours, cells, busiest, peaks } = report
    return (
        <>
            <KpiStrip
                columns={4}
                items={[
                    { label: 'Busiest slot', value: busiest ? `${WEEKDAY_SHORT[busiest.weekday]} ${formatHourLabel(busiest.hour)}` : '—', description: busiest ? `${busiest.count} check-ins` : undefined },
                    { label: 'Busiest hour', value: peaks.busiestHour ? formatHourLabel(peaks.busiestHour.hour) : '—', description: peaks.busiestHour ? `${peaks.busiestHour.visits} check-ins across the period` : undefined },
                    { label: 'Busiest weekday', value: peaks.busiestWeekday ? WEEKDAY_SHORT[peaks.busiestWeekday.weekday] : '—', description: peaks.busiestWeekday ? `${peaks.busiestWeekday.perDay.toFixed(1)} check-ins per such day` : undefined },
                    { label: 'Weekday vs weekend', value: `${peaks.weekdayPerDay.toFixed(1)} · ${peaks.weekendPerDay.toFixed(1)}`, description: 'Check-ins per day, Mon–Fri · Sat–Sun' },
                ]}
            />
            <HeatGrid
                title="Check-ins by hour and weekday"
                subtitle="Relative busyness across the period; the data holds no capacity, so this is not occupancy"
                rows={hours.map(formatHourLabel)}
                columns={WEEKDAY_SHORT}
                cells={cells}
                unit="check-ins"
                rowHeader="Hour"
                caption={busiest ? `Busiest: ${WEEKDAY_LABELS[busiest.weekday]} ${formatHourLabel(busiest.hour)} · ${busiest.count} check-ins` : undefined}
                emptyMessage="No visits in this period"
            />
            <InsightBar insight={heatmapInsight(report)} />
        </>
    )
}

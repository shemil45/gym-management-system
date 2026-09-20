import { WEEKDAY_SHORT } from '@/lib/reports/attendance-aggregate'
import type { FootfallReport } from '@/lib/reports/attendance'
import { footfallInsight } from '@/lib/reports/attendance-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import StackedBarChart from '@/components/reports/charts/StackedBarChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'
import AttendanceTrend from '@/components/reports/attendance/AttendanceTrend'

/**
 * Trend → visit frequency and entry method → busiest periods → one insight,
 * then the footfall table. All of it reads `FootfallReport`, built from the
 * same visits the table sums. "Busiest" is relative: the data holds no
 * capacity or opening hours, so nothing here is a utilisation figure.
 */
export default function FootfallAnalytics({ report }: { report: FootfallReport }) {
    const { frequency, methods, hours, peaks } = report

    return (
        <>
            <AttendanceTrend buckets={report.buckets} comparisonBuckets={report.comparisonBuckets} compare={report.compare} />

            <div className="grid gap-4 lg:grid-cols-2">
                <ShareChart
                    title="Visit frequency"
                    subtitle="How many times each visiting member came in during this period"
                    format="number"
                    order="given"
                    data={frequency.map((b) => ({ label: b.label, value: b.members, detail: 'members' }))}
                    emptyMessage="No visits in this period"
                />
                <ShareChart
                    title="Entry method"
                    subtitle="Visits by how the member was checked in"
                    format="number"
                    data={methods.map((m) => ({ label: m.label, value: m.visits, detail: 'visits' }))}
                    emptyMessage="No visits in this period"
                />
            </div>

            <KpiStrip
                columns={3}
                items={[
                    {
                        label: 'Busiest weekday',
                        value: peaks.busiestWeekday ? WEEKDAY_SHORT[peaks.busiestWeekday.weekday] : '—',
                        description: peaks.busiestWeekday ? `${peaks.busiestWeekday.perDay.toFixed(1)} visits per such day` : undefined,
                    },
                    { label: 'Weekday visits / day', value: peaks.weekdayPerDay.toFixed(1), description: `${peaks.weekdayVisits} visits Mon–Fri` },
                    { label: 'Weekend visits / day', value: peaks.weekendPerDay.toFixed(1), description: `${peaks.weekendVisits} visits Sat–Sun` },
                ]}
            />

            <StackedBarChart
                title="Peak attendance by hour"
                subtitle="Check-ins by hour of day across the period — relative busyness, not occupancy"
                data={hours.map((h) => ({ label: h.label, visits: h.visits }))}
                xKey="label"
                series={[{ key: 'visits', label: 'Visits' }]}
                format="number"
                height={220}
                emptyMessage="No visits in this period"
            />

            <InsightBar insight={footfallInsight(report)} />
        </>
    )
}

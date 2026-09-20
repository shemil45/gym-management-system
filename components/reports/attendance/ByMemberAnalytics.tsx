import type { ByMemberReport } from '@/lib/reports/attendance'
import { byMemberInsight } from '@/lib/reports/attendance-insights'
import ShareChart from '@/components/reports/charts/ShareChart'
import KpiStrip from '@/components/reports/kpi/KpiStrip'
import InsightBar from '@/components/reports/InsightBar'

/**
 * Summary → segments → first-30-days → one insight, then the member table.
 * Stays compact on purpose: this tab is the data view. Segments are the
 * visits-per-week rules in `SEGMENT_RULES`, printed beside each row; there
 * is no score behind them and no ranking of members.
 */
export default function ByMemberAnalytics({ report }: { report: ByMemberReport }) {
    const { summary, segments, onboarding } = report
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

    return (
        <>
            <KpiStrip
                columns={5}
                items={[
                    { label: 'Members who visited', value: String(summary.members), description: `${plural(summary.everyWeek, 'visited', 'visited')} in every one of the ${summary.weeksInPeriod} weeks` },
                    { label: 'Avg visits / member', value: summary.avgVisits.toFixed(1) },
                    { label: 'Gap of 7+ days', value: String(summary.gap7), description: 'Since their last visit', tone: summary.gap7 > 0 ? 'default' : 'positive' },
                    { label: 'Gap of 14+ days', value: String(summary.gap14), description: 'Since their last visit', tone: summary.gap14 > 0 ? 'negative' : 'positive' },
                    { label: 'Gap of 30+ days', value: String(summary.gap30), description: 'Since their last visit', tone: summary.gap30 > 0 ? 'negative' : 'positive' },
                ]}
            />

            <div className="grid gap-4 lg:grid-cols-2">
                <ShareChart
                    title="Engagement segments"
                    subtitle="Visitors by visits per week over this period, plus active members with no visit"
                    format="number"
                    order="given"
                    data={segments.map((s) => ({ label: s.label, value: s.members, detail: s.rule }))}
                    emptyMessage="No visits in this period"
                />
                <ShareChart
                    title="First 30 days"
                    subtitle={onboarding.cohort > 0
                        ? `Average visits per week after joining, for the ${plural(onboarding.cohort, 'member', 'members')} whose first four weeks fall inside this period`
                        : 'Shown once a member has joined at least 28 days before the end of the selected period'}
                    format="number"
                    order="given"
                    data={onboarding.weeks.map((avg, i) => ({ label: `Week ${i + 1}`, value: Math.round(avg * 100) / 100, detail: 'avg visits' }))}
                    emptyMessage={onboarding.cohort > 0 ? 'No visits in the first four weeks' : 'No qualifying new members in this period'}
                />
            </div>

            <InsightBar insight={byMemberInsight(report)} />
        </>
    )
}

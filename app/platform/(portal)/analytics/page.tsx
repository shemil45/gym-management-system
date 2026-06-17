import Link from 'next/link'
import { EmptyState, PlatformCardHeader, PlatformShellCard } from '@/components/platform/PortalUI'
import { getPlatformDashboardData } from '@/lib/platform/server'
import { formatCurrency } from '@/lib/utils/currency'

function toCsvRow(values: Array<string | number | null | undefined>) {
    return values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
}

export default async function PlatformAnalyticsPage() {
    const data = await getPlatformDashboardData()
    const memberGrowth = data.members.reduce<Record<string, number>>((accumulator, member) => {
        const date = member.created_at?.slice(0, 10) || 'unknown'
        accumulator[date] = (accumulator[date] ?? 0) + 1
        return accumulator
    }, {})

    const csvPreview = [
        toCsvRow(['metric', 'value']),
        toCsvRow(['total_gyms', data.metrics.totalGyms]),
        toCsvRow(['total_members', data.metrics.totalMembers]),
        toCsvRow(['mrr', data.metrics.mrr]),
        toCsvRow(['arr', data.metrics.arr]),
    ].join('\n')

    return (
        <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-2">
                <PlatformShellCard>
                    <PlatformCardHeader
                        eyebrow="Growth"
                        title="Platform daily snapshots"
                        description="Latest rollups from `platform_daily_stats`."
                        action={<Link href="/platform/exports?type=overview&format=csv" className="text-sm font-medium text-indigo-700 hover:text-indigo-600">Export CSV</Link>}
                    />
                    <div className="space-y-3 p-5">
                        {data.platformStats.length ? data.platformStats.map((stat) => (
                            <div key={stat.id} className="grid gap-3 rounded-lg border border-slate-200 px-4 py-3 md:grid-cols-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Date</p>
                                    <p className="mt-1 font-medium text-slate-950">{stat.stat_date}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Gyms</p>
                                    <p className="mt-1 font-medium text-slate-950">{stat.total_gyms}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Members</p>
                                    <p className="mt-1 font-medium text-slate-950">{stat.total_members_all}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">MRR</p>
                                    <p className="mt-1 font-medium text-slate-950">{formatCurrency(Number(stat.mrr || 0))}</p>
                                </div>
                            </div>
                        )) : <EmptyState message="No platform snapshots have been recorded yet." />}
                    </div>
                </PlatformShellCard>

                <PlatformShellCard>
                    <PlatformCardHeader
                        eyebrow="Exports"
                        title="Export preview"
                        description="CSV and Excel-compatible downloads generated from the server route."
                        action={<Link href="/platform/exports?type=billing&format=excel" className="text-sm font-medium text-indigo-700 hover:text-indigo-600">Export Excel</Link>}
                    />
                    <div className="space-y-4 p-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 p-4">
                                <p className="text-sm text-slate-500">MRR</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(Number(data.metrics.mrr || 0))}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 p-4">
                                <p className="text-sm text-slate-500">ARR</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(Number(data.metrics.arr || 0))}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 p-4">
                                <p className="text-sm text-slate-500">Churned gyms</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{data.metrics.churnedGyms}</p>
                            </div>
                        </div>
                        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">{csvPreview}</pre>
                        <div className="rounded-lg border border-slate-200 p-4">
                            <p className="text-sm font-medium text-slate-700">Members added by day</p>
                            <div className="mt-3 space-y-2">
                                {Object.entries(memberGrowth).slice(-8).map(([date, count]) => (
                                    <div key={date} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">{date}</span>
                                        <span className="font-medium text-slate-950">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </PlatformShellCard>
            </section>
        </div>
    )
}

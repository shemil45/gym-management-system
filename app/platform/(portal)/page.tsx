import Link from 'next/link'
import {
    EmptyState,
    PlatformBadge,
    PlatformCardHeader,
    PlatformMetricCard,
    PlatformShellCard,
} from '@/components/platform/PortalUI'
import { getPlatformDashboardData } from '@/lib/platform/server'
import { formatCompactCurrency, formatCurrency } from '@/lib/utils/currency'

function toneForTicket(status: string) {
    if (status === 'resolved' || status === 'closed') return 'success'
    if (status === 'waiting_on_gym') return 'warning'
    if (status === 'open') return 'danger'
    return 'accent'
}

export default async function PlatformDashboardPage() {
    const data = await getPlatformDashboardData()

    return (
        <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <PlatformMetricCard label="Total gyms" value={data.metrics.totalGyms.toString()} />
                <PlatformMetricCard label="Total members" value={data.metrics.totalMembers.toString()} />
                <PlatformMetricCard label="MRR" value={formatCompactCurrency(Number(data.metrics.mrr || 0))} tone="positive" />
                <PlatformMetricCard label="ARR" value={formatCompactCurrency(Number(data.metrics.arr || 0))} />
                <PlatformMetricCard label="New gyms (30d)" value={data.metrics.newGyms.toString()} />
                <PlatformMetricCard label="Churned gyms" value={data.metrics.churnedGyms.toString()} tone="warning" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <PlatformShellCard>
                    <PlatformCardHeader
                        eyebrow="Dashboard"
                        title="Platform momentum"
                        description="Latest snapshot of SaaS growth, billing activity, and support movement."
                        action={<Link href="/platform/analytics" className="text-sm font-medium text-indigo-700 hover:text-indigo-600">Open analytics</Link>}
                    />
                    <div className="grid gap-4 p-5 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-medium text-slate-700">Revenue run-rate</p>
                            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{formatCurrency(Number(data.metrics.mrr || 0))}</p>
                            <p className="mt-2 text-sm text-slate-600">Monthly recurring revenue across active and trialing gyms.</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-medium text-slate-700">Attention needed</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <PlatformBadge tone="warning">{data.alerts.expiringTrials.length} trials ending soon</PlatformBadge>
                                <PlatformBadge tone="danger">{data.alerts.failedPayments.length} overdue invoices</PlatformBadge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">Use billing and gyms views to intervene before revenue slips.</p>
                        </div>
                    </div>
                    <div className="border-t border-slate-200 p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Recent activity</h3>
                                <p className="mt-1 text-sm text-slate-600">Latest signups, invoice state changes, and ticket updates.</p>
                            </div>
                            <Link href="/platform/audit" className="text-sm font-medium text-indigo-700 hover:text-indigo-600">View audit trail</Link>
                        </div>
                        <div className="space-y-3">
                            {data.recentActivity.length ? data.recentActivity.map((item) => (
                                <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{item.type.replace(/_/g, ' ')}</p>
                                    </div>
                                    <span className="text-sm text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
                                </div>
                            )) : <EmptyState message="No activity has been recorded yet." />}
                        </div>
                    </div>
                </PlatformShellCard>

                <div className="space-y-6">
                    <PlatformShellCard>
                        <PlatformCardHeader
                            eyebrow="Support"
                            title="Open ticket queue"
                            description="Newest platform conversations and ticket status changes."
                            action={<Link href="/platform/support" className="text-sm font-medium text-indigo-700 hover:text-indigo-600">Open queue</Link>}
                        />
                        <div className="space-y-3 p-5">
                            {data.tickets.length ? data.tickets.slice(0, 5).map((ticket) => (
                                <div key={ticket.id} className="rounded-lg border border-slate-200 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-slate-950">{ticket.ticket_number}</p>
                                            <p className="mt-1 text-sm text-slate-700">{ticket.subject}</p>
                                        </div>
                                        <PlatformBadge tone={toneForTicket(ticket.status) as never}>
                                            {ticket.status.replace(/_/g, ' ')}
                                        </PlatformBadge>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-500">Updated {new Date(ticket.updated_at).toLocaleString()}</p>
                                </div>
                            )) : <EmptyState message="No support tickets yet." />}
                        </div>
                    </PlatformShellCard>

                    <PlatformShellCard>
                        <PlatformCardHeader
                            eyebrow="Announcements"
                            title="Live broadcasts"
                            description="Published messages that are currently visible in tenant portals."
                            action={<Link href="/platform/announcements" className="text-sm font-medium text-indigo-700 hover:text-indigo-600">Manage</Link>}
                        />
                        <div className="space-y-3 p-5">
                            {data.announcements.length ? data.announcements.map((announcement) => (
                                <div key={announcement.id} className="rounded-lg border border-slate-200 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-medium text-slate-950">{announcement.title}</p>
                                        <PlatformBadge tone={announcement.type === 'critical' ? 'danger' : announcement.type === 'warning' ? 'warning' : 'info'}>
                                            {announcement.type}
                                        </PlatformBadge>
                                    </div>
                                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{announcement.body}</p>
                                </div>
                            )) : <EmptyState message="No announcements are published right now." />}
                        </div>
                    </PlatformShellCard>
                </div>
            </section>
        </div>
    )
}

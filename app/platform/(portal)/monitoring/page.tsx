import { EmptyState, PlatformBadge, PlatformCardHeader, PlatformShellCard } from '@/components/platform/PortalUI'
import { getPlatformDashboardData, getPlatformSettingsData } from '@/lib/platform/server'

export default async function PlatformMonitoringPage() {
    const [settings, dashboard] = await Promise.all([
        getPlatformSettingsData(),
        getPlatformDashboardData(),
    ])

    return (
        <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <PlatformShellCard>
                    <PlatformCardHeader eyebrow="Platform admins" title="Internal access roster" description="Current staff with access to the platform workspace." />
                    <div className="space-y-3 p-5">
                        {settings.admins.length ? settings.admins.map((admin) => (
                            <div key={admin.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                                <div>
                                    <p className="font-medium text-slate-950">{admin.full_name}</p>
                                    <p className="text-sm text-slate-500">{admin.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PlatformBadge tone={admin.is_active ? 'success' : 'neutral'}>
                                        {admin.is_active ? 'Active' : 'Inactive'}
                                    </PlatformBadge>
                                    <PlatformBadge tone="accent">{admin.role.replace(/_/g, ' ')}</PlatformBadge>
                                </div>
                            </div>
                        )) : <EmptyState message="No platform admins have been added yet." />}
                    </div>
                </PlatformShellCard>

                <PlatformShellCard>
                    <PlatformCardHeader eyebrow="Snapshots" title="Platform health trend" description="Recent daily rollups from the reporting tables." />
                    <div className="space-y-3 p-5">
                        {dashboard.platformStats.length ? dashboard.platformStats.map((stat) => (
                            <div key={stat.id} className="grid gap-3 rounded-lg border border-slate-200 px-4 py-3 md:grid-cols-5">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Date</p>
                                    <p className="mt-1 font-medium text-slate-950">{stat.stat_date}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Active gyms</p>
                                    <p className="mt-1 font-medium text-slate-950">{stat.active_gyms}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Trial gyms</p>
                                    <p className="mt-1 font-medium text-slate-950">{stat.trial_gyms}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Suspended</p>
                                    <p className="mt-1 font-medium text-slate-950">{stat.suspended_gyms}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Snapshot time</p>
                                    <p className="mt-1 font-medium text-slate-950">{new Date(stat.snapshot_at).toLocaleString()}</p>
                                </div>
                            </div>
                        )) : <EmptyState message="No platform health snapshots have been generated yet." />}
                    </div>
                </PlatformShellCard>
            </section>
        </div>
    )
}

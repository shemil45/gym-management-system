import { EmptyState, PlatformBadge, PlatformCardHeader, PlatformShellCard } from '@/components/platform/PortalUI'
import { getPlatformSettingsData } from '@/lib/platform/server'

export default async function PlatformAuditPage() {
    const settings = await getPlatformSettingsData()

    return (
        <PlatformShellCard>
            <PlatformCardHeader
                eyebrow="Audit"
                title="Platform audit trail"
                description="Immutable log of platform-side actions across subscriptions, support, flags, announcements, and impersonation."
            />
            <div className="space-y-3 p-5">
                {settings.auditLogs.length ? settings.auditLogs.map((event) => (
                    <div key={event.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-slate-950">{event.action}</p>
                                    {event.is_impersonation ? <PlatformBadge tone="warning">Impersonation</PlatformBadge> : null}
                                </div>
                                <p className="mt-2 text-sm text-slate-700">
                                    {event.entity_type}
                                    {event.entity_id ? ` · ${event.entity_id}` : ''}
                                    {event.gym_id ? ` · gym ${event.gym_id}` : ''}
                                </p>
                                {(event.old_data || event.new_data) ? (
                                    <pre className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                        {JSON.stringify({ old: event.old_data, new: event.new_data }, null, 2)}
                                    </pre>
                                ) : null}
                            </div>
                            <div className="text-sm text-slate-500 lg:text-right">
                                <p>{new Date(event.created_at).toLocaleString()}</p>
                                {event.user_agent ? <p className="mt-2 max-w-[280px] break-words">{event.user_agent}</p> : null}
                            </div>
                        </div>
                    </div>
                )) : <EmptyState message="No audit entries have been captured yet." />}
            </div>
        </PlatformShellCard>
    )
}

import { publishAnnouncement } from '@/app/platform/actions'
import {
    EmptyState,
    PlatformBadge,
    PlatformButton,
    PlatformCardHeader,
    PlatformInput,
    PlatformSelect,
    PlatformShellCard,
    PlatformTextarea,
} from '@/components/platform/PortalUI'
import { getPlatformGyms, getPlatformSettingsData } from '@/lib/platform/server'

export default async function PlatformAnnouncementsPage() {
    const [gyms, settings] = await Promise.all([
        getPlatformGyms(),
        getPlatformSettingsData(),
    ])

    return (
        <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <PlatformShellCard>
                    <PlatformCardHeader eyebrow="Broadcast" title="Publish announcement" description="Target all gyms, a specific gym, or a plan segment." />
                    <form action={publishAnnouncement} className="space-y-4 p-5">
                        <PlatformInput name="title" placeholder="Announcement title" />
                        <PlatformTextarea name="body" rows={7} placeholder="Write the message that appears inside the tenant portal." />
                        <PlatformSelect name="type" defaultValue="info">
                            <option value="info">Info</option>
                            <option value="feature">Feature</option>
                            <option value="warning">Warning</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="critical">Critical</option>
                        </PlatformSelect>
                        <PlatformSelect name="gym_id">
                            <option value="">All gyms</option>
                            {gyms.map((gym) => (
                                <option key={gym.id} value={gym.id}>{gym.name}</option>
                            ))}
                        </PlatformSelect>
                        <PlatformSelect name="plan_id">
                            <option value="">All plans</option>
                            {settings.plans.map((plan) => (
                                <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                        </PlatformSelect>
                        <PlatformInput name="expires_at" type="datetime-local" />
                        <PlatformButton>Publish announcement</PlatformButton>
                    </form>
                </PlatformShellCard>

                <PlatformShellCard>
                    <PlatformCardHeader eyebrow="History" title="Announcement history" description="Published and drafted broadcasts for the admin team." />
                    <div className="space-y-3 p-5">
                        {settings.announcements.length ? settings.announcements.map((announcement) => (
                            <div key={announcement.id} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-slate-950">{announcement.title}</p>
                                    <PlatformBadge tone={announcement.type === 'critical' ? 'danger' : announcement.type === 'warning' ? 'warning' : 'info'}>
                                        {announcement.type}
                                    </PlatformBadge>
                                    <PlatformBadge tone={announcement.is_published ? 'success' : 'neutral'}>
                                        {announcement.is_published ? 'Published' : 'Draft'}
                                    </PlatformBadge>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.body}</p>
                                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                                    Created {new Date(announcement.created_at).toLocaleString()}
                                </p>
                            </div>
                        )) : <EmptyState message="No announcements have been created yet." />}
                    </div>
                </PlatformShellCard>
            </section>
        </div>
    )
}

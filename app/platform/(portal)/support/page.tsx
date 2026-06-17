import { addSupportReply, createSupportTicket } from '@/app/platform/actions'
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
import { getPlatformSupportData } from '@/lib/platform/server'

export default async function PlatformSupportPage() {
    const data = await getPlatformSupportData()

    return (
        <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <PlatformShellCard>
                    <PlatformCardHeader eyebrow="New ticket" title="Create support thread" description="Start a conversation on behalf of the platform operations team." />
                    <form action={createSupportTicket} className="space-y-4 p-5">
                        <PlatformSelect name="gym_id">
                            {data.gyms.map((gym) => (
                                <option key={gym.id} value={gym.id}>{gym.name}</option>
                            ))}
                        </PlatformSelect>
                        <div className="grid gap-3 md:grid-cols-2">
                            <PlatformInput name="subject" placeholder="Subject" />
                            <PlatformInput name="category" defaultValue="general" placeholder="Category" />
                        </div>
                        <PlatformSelect name="priority" defaultValue="medium">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </PlatformSelect>
                        <PlatformTextarea name="message" rows={7} placeholder="Conversation opener" />
                        <PlatformButton>Create support ticket</PlatformButton>
                    </form>
                </PlatformShellCard>

                <PlatformShellCard>
                    <PlatformCardHeader eyebrow="Queue" title="Active support tickets" description="Most recent ticket threads across all tenant gyms." />
                    <div className="space-y-4 p-5">
                        {data.tickets.length ? data.tickets.map((ticket) => (
                            <div key={ticket.id} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-slate-950">{ticket.ticket_number}</p>
                                            <PlatformBadge tone={ticket.priority === 'urgent' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'neutral'}>
                                                {ticket.priority}
                                            </PlatformBadge>
                                            <PlatformBadge tone={ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'accent'}>
                                                {ticket.status.replace(/_/g, ' ')}
                                            </PlatformBadge>
                                        </div>
                                        <p className="mt-2 text-sm text-slate-700">{ticket.subject}</p>
                                    </div>
                                    <span className="text-sm text-slate-500">{new Date(ticket.updated_at).toLocaleString()}</span>
                                </div>

                                <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    {data.messages.filter((message) => message.ticket_id === ticket.id).slice(0, 3).map((message) => (
                                        <div key={message.id} className="rounded-md border border-slate-200 bg-white p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <PlatformBadge tone={message.sender_type === 'platform_admin' ? 'accent' : 'neutral'}>
                                                    {message.sender_type.replace(/_/g, ' ')}
                                                </PlatformBadge>
                                                {message.is_internal_note ? <PlatformBadge tone="warning">Internal note</PlatformBadge> : null}
                                            </div>
                                            <p className="mt-2 text-sm text-slate-700">{message.body}</p>
                                        </div>
                                    ))}
                                </div>

                                <form action={addSupportReply} className="mt-4 space-y-3">
                                    <input type="hidden" name="ticket_id" value={ticket.id} />
                                    <input type="hidden" name="gym_id" value={ticket.gym_id} />
                                    <PlatformTextarea name="message" rows={3} placeholder="Send a reply..." />
                                    <div className="flex flex-wrap gap-3">
                                        <PlatformSelect name="status" defaultValue="in_progress" className="w-[200px]">
                                            <option value="in_progress">In progress</option>
                                            <option value="waiting_on_gym">Waiting on gym</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </PlatformSelect>
                                        <PlatformSelect name="is_internal_note" defaultValue="false" className="w-[180px]">
                                            <option value="false">Public reply</option>
                                            <option value="true">Internal note</option>
                                        </PlatformSelect>
                                        <PlatformButton>Reply</PlatformButton>
                                    </div>
                                </form>
                            </div>
                        )) : <EmptyState message="No support tickets are open right now." />}
                    </div>
                </PlatformShellCard>
            </section>
        </div>
    )
}

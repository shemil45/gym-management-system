import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
    createInvoice,
    extendGymTrial,
    resetGymAdminAccess,
    setGymFeatureOverride,
    startImpersonation,
    updateGymNotes,
    updateGymStatus,
    updateGymSubscription,
} from '@/app/platform/actions'
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
import { getPlatformGymDetail, getPlatformSettingsData } from '@/lib/platform/server'
import { formatCurrency } from '@/lib/utils/currency'

export default async function PlatformGymDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const [detail, settings] = await Promise.all([
        getPlatformGymDetail(id),
        getPlatformSettingsData(),
    ])

    if (!detail.gym) notFound()
    const gym = detail.gym

    return (
        <div className="space-y-6">
            <PlatformShellCard>
                <div className="flex flex-col gap-4 px-5 py-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <Link href="/platform/gyms" className="text-sm font-medium text-indigo-700 hover:text-indigo-600">Back to gyms</Link>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{gym.name}</h1>
                        <p className="mt-2 text-sm text-slate-600">
                            {gym.business_name || 'Business name not set'} · {gym.contact_email || 'No contact email'} · {gym.contact_phone || 'No contact phone'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            {[gym.city, gym.state, gym.country].filter(Boolean).join(', ') || 'Location not set'}
                            {gym.timezone ? ` · ${gym.timezone}` : ''}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <form action={startImpersonation} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <input type="hidden" name="gym_id" value={gym.id} />
                            <PlatformInput name="reason" placeholder="Reason for access" className="mb-3" />
                            <PlatformButton className="w-full">Start impersonation</PlatformButton>
                        </form>
                        <form action={resetGymAdminAccess} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <input type="hidden" name="gym_id" value={gym.id} />
                            <PlatformButton tone="secondary" className="w-full">Reset admin access</PlatformButton>
                        </form>
                    </div>
                </div>
            </PlatformShellCard>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                    <PlatformShellCard>
                        <PlatformCardHeader eyebrow="Account state" title="Status and notes" description="Tenant status, onboarding, and internal account notes." />
                        <div className="grid gap-4 p-5 lg:grid-cols-2">
                            <form action={updateGymStatus} className="space-y-3 rounded-lg border border-slate-200 p-4">
                                <input type="hidden" name="gym_id" value={gym.id} />
                                <PlatformSelect name="status" defaultValue={gym.platform_status}>
                                    <option value="active">Active</option>
                                    <option value="trialing">Trialing</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="cancelled">Cancelled</option>
                                </PlatformSelect>
                                <PlatformInput name="reason" placeholder="Suspension reason" />
                                <PlatformButton>Save status</PlatformButton>
                            </form>

                            <form action={updateGymNotes} className="space-y-3 rounded-lg border border-slate-200 p-4">
                                <input type="hidden" name="gym_id" value={gym.id} />
                                <PlatformTextarea name="notes" defaultValue={gym.platform_notes || ''} rows={5} />
                                <PlatformButton tone="secondary">Update notes</PlatformButton>
                            </form>
                        </div>
                    </PlatformShellCard>

                    <PlatformShellCard>
                        <PlatformCardHeader eyebrow="Billing" title="Subscription" description="Assigned SaaS plan, billing cadence, and trial controls." />
                        <div className="grid gap-4 p-5 lg:grid-cols-2">
                            <form action={updateGymSubscription} className="space-y-3 rounded-lg border border-slate-200 p-4">
                                <input type="hidden" name="gym_id" value={gym.id} />
                                <PlatformSelect name="plan_id" defaultValue={detail.subscription?.saas_plan_id || settings.plans[0]?.id}>
                                    {settings.plans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                                    ))}
                                </PlatformSelect>
                                <PlatformSelect name="status" defaultValue={detail.subscription?.status || 'trialing'}>
                                    <option value="trialing">Trialing</option>
                                    <option value="active">Active</option>
                                    <option value="past_due">Past due</option>
                                    <option value="paused">Paused</option>
                                    <option value="cancelled">Cancelled</option>
                                </PlatformSelect>
                                <PlatformSelect name="billing_cycle" defaultValue={detail.subscription?.billing_cycle || 'monthly'}>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </PlatformSelect>
                                <PlatformInput name="discount_pct" type="number" step="0.01" defaultValue={detail.subscription?.discount_pct || 0} placeholder="Discount %" />
                                <PlatformButton>Save subscription</PlatformButton>
                            </form>

                            <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                                <form action={extendGymTrial} className="space-y-3">
                                    <input type="hidden" name="gym_id" value={gym.id} />
                                    <PlatformInput name="extra_days" type="number" min="1" defaultValue={7} />
                                    <PlatformButton tone="secondary">Extend trial</PlatformButton>
                                </form>
                                <form action={createInvoice} className="space-y-3">
                                    <input type="hidden" name="gym_id" value={gym.id} />
                                    <PlatformInput name="amount_due" type="number" step="0.01" defaultValue={detail.subscription?.plan ? (detail.subscription.billing_cycle === 'yearly' ? detail.subscription.plan.price_yearly / 12 : detail.subscription.plan.price_monthly) : 0} />
                                    <PlatformButton tone="secondary">Generate invoice</PlatformButton>
                                </form>
                            </div>
                        </div>
                    </PlatformShellCard>

                    <PlatformShellCard>
                        <PlatformCardHeader eyebrow="Audit" title="Recent activity" description="Latest platform-side actions scoped to this gym." />
                        <div className="space-y-3 p-5">
                            {detail.activity.length ? detail.activity.map((event) => (
                                <div key={event.id} className="rounded-lg border border-slate-200 p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-slate-950">{event.action}</p>
                                        {event.is_impersonation ? <PlatformBadge tone="warning">Impersonation</PlatformBadge> : null}
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">{JSON.stringify(event.new_data || event.old_data || {})}</p>
                                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                                </div>
                            )) : <EmptyState message="No platform activity has been logged for this gym yet." />}
                        </div>
                    </PlatformShellCard>
                </div>

                <div className="space-y-6">
                    <PlatformShellCard>
                        <PlatformCardHeader eyebrow="Summary" title="At a glance" description="Key counts and latest account posture." />
                        <div className="grid gap-3 p-5">
                            <div className="rounded-lg border border-slate-200 p-4">
                                <p className="text-sm text-slate-500">Members</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-950">{detail.members.length}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 p-4">
                                <p className="text-sm text-slate-500">Invoices</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-950">{detail.invoices.length}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 p-4">
                                <p className="text-sm text-slate-500">Open tickets</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-950">{detail.tickets.filter((ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed').length}</p>
                            </div>
                        </div>
                    </PlatformShellCard>

                    <PlatformShellCard>
                        <PlatformCardHeader eyebrow="Invoices" title="Recent invoices" description="Latest SaaS invoices generated for this gym." />
                        <div className="space-y-3 p-5">
                            {detail.invoices.length ? detail.invoices.slice(0, 5).map((invoice) => (
                                <div key={invoice.id} className="rounded-lg border border-slate-200 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-medium text-slate-950">{invoice.invoice_number}</p>
                                        <PlatformBadge tone={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'warning' : 'accent'}>
                                            {invoice.status}
                                        </PlatformBadge>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">{formatCurrency(invoice.amount)} due · {invoice.due_date}</p>
                                </div>
                            )) : <EmptyState message="No invoices have been created for this gym yet." />}
                        </div>
                    </PlatformShellCard>

                    <PlatformShellCard>
                        <PlatformCardHeader eyebrow="Feature flags" title="Gym overrides" description="Per-gym feature flags layered on top of plan defaults." />
                        <div className="space-y-3 p-5">
                            {settings.planFeatures.length ? settings.planFeatures.map((feature) => {
                                const override = detail.featureFlags.find((entry) => entry.flag_key === feature.key)
                                return (
                                    <form key={feature.key} action={setGymFeatureOverride} className="rounded-lg border border-slate-200 p-4">
                                        <input type="hidden" name="gym_id" value={gym.id} />
                                        <input type="hidden" name="flag_key" value={feature.key} />
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <p className="font-medium text-slate-950">{feature.key}</p>
                                                <p className="mt-1 text-xs text-slate-500">{override ? 'Override saved' : 'Using plan default'}</p>
                                            </div>
                                            <PlatformInput name="note" defaultValue={override?.note || ''} placeholder="Optional note" />
                                            <div className="flex gap-3">
                                                <PlatformSelect name="is_enabled" defaultValue={String(override?.is_enabled ?? true)} className="max-w-[180px]">
                                                    <option value="true">Enabled</option>
                                                    <option value="false">Disabled</option>
                                                </PlatformSelect>
                                                <PlatformButton tone="secondary">Save override</PlatformButton>
                                            </div>
                                        </div>
                                    </form>
                                )
                            }) : <EmptyState message="No plan features are available to override yet." />}
                        </div>
                    </PlatformShellCard>
                </div>
            </section>
        </div>
    )
}

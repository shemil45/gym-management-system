import { createInvoice, updateGymSubscription } from '@/app/platform/actions'
import {
    EmptyState,
    PlatformBadge,
    PlatformButton,
    PlatformCardHeader,
    PlatformShellCard,
} from '@/components/platform/PortalUI'
import { getPlatformGyms, getPlatformSettingsData } from '@/lib/platform/server'
import { getSubscriptionAmount } from '@/lib/platform/types'
import { formatCurrency } from '@/lib/utils/currency'

export default async function PlatformBillingPage() {
    const [gyms, settings] = await Promise.all([
        getPlatformGyms(),
        getPlatformSettingsData(),
    ])

    return (
        <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <PlatformShellCard>
                    <PlatformCardHeader eyebrow="Plans" title="SaaS plans" description="Current sellable tiers seeded into the platform catalog." />
                    <div className="grid gap-4 p-5 md:grid-cols-3">
                        {settings.plans.map((plan) => (
                            <div key={plan.id} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-lg font-semibold text-slate-950">{plan.name}</p>
                                    <PlatformBadge tone={plan.is_active ? 'success' : 'neutral'}>
                                        {plan.is_active ? 'Active' : 'Hidden'}
                                    </PlatformBadge>
                                </div>
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{plan.slug}</p>
                                <p className="mt-4 text-sm text-slate-700">{formatCurrency(plan.price_monthly)}/mo</p>
                                <p className="text-sm text-slate-500">{formatCurrency(plan.price_yearly)}/yr</p>
                            </div>
                        ))}
                    </div>
                </PlatformShellCard>

                <PlatformShellCard>
                    <PlatformCardHeader eyebrow="Revenue" title="MRR by plan" description="Monthly equivalent revenue contribution from current subscriptions." />
                    <div className="space-y-3 p-5">
                        {settings.plans.map((plan) => {
                            const gymsOnPlan = gyms.filter((gym) => gym.subscription?.saas_plan_id === plan.id)
                            const revenue = gymsOnPlan.reduce((sum, gym) => sum + getSubscriptionAmount(gym.subscription, gym.subscription?.plan), 0)
                            return (
                                <div key={plan.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                                    <div>
                                        <p className="font-medium text-slate-950">{plan.name}</p>
                                        <p className="text-sm text-slate-500">{gymsOnPlan.length} gyms on this tier</p>
                                    </div>
                                    <p className="font-semibold text-slate-950">{formatCurrency(revenue)}</p>
                                </div>
                            )
                        })}
                    </div>
                </PlatformShellCard>
            </section>

            <PlatformShellCard>
                <PlatformCardHeader eyebrow="Subscriptions" title="Billing roster" description="Current subscription state for every gym on the platform." />
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Gym</th>
                                <th className="px-4 py-3 font-medium">Plan</th>
                                <th className="px-4 py-3 font-medium">Cycle</th>
                                <th className="px-4 py-3 font-medium">Discount</th>
                                <th className="px-4 py-3 font-medium">MRR</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Period end</th>
                                <th className="px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gyms.length ? gyms.map((gym) => (
                                <tr key={gym.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                                    <td className="px-4 py-4 font-medium text-slate-950">{gym.name}</td>
                                    <td className="px-4 py-4 text-slate-700">{gym.subscription?.plan?.name || 'Unassigned'}</td>
                                    <td className="px-4 py-4 text-slate-700">{gym.subscription?.billing_cycle || 'n/a'}</td>
                                    <td className="px-4 py-4 text-slate-700">{gym.subscription?.discount_pct ?? 0}%</td>
                                    <td className="px-4 py-4 font-medium text-slate-950">{formatCurrency(gym.mrr)}</td>
                                    <td className="px-4 py-4">
                                        <PlatformBadge tone={gym.subscription?.status === 'past_due' ? 'warning' : gym.subscription?.status === 'active' ? 'success' : 'accent'}>
                                            {gym.subscription?.status?.replace(/_/g, ' ') || 'none'}
                                        </PlatformBadge>
                                    </td>
                                    <td className="px-4 py-4 text-slate-700">{gym.subscription?.current_period_end || 'n/a'}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <form action={createInvoice}>
                                                <input type="hidden" name="gym_id" value={gym.id} />
                                                <input type="hidden" name="amount_due" value={gym.mrr || 0} />
                                                <PlatformButton tone="secondary">Invoice</PlatformButton>
                                            </form>
                                            <form action={updateGymSubscription} className="flex flex-wrap items-center gap-2">
                                                <input type="hidden" name="gym_id" value={gym.id} />
                                                <select name="plan_id" defaultValue={gym.subscription?.saas_plan_id || settings.plans[0]?.id} className="h-9 rounded-md border border-slate-300 px-2 text-xs">
                                                    {settings.plans.map((plan) => (
                                                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                                                    ))}
                                                </select>
                                                <input type="hidden" name="status" value={gym.subscription?.status || 'active'} />
                                                <input type="hidden" name="billing_cycle" value={gym.subscription?.billing_cycle || 'monthly'} />
                                                <input type="hidden" name="discount_pct" value={gym.subscription?.discount_pct || 0} />
                                                <PlatformButton>Save</PlatformButton>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8">
                                        <EmptyState message="No subscriptions have been created yet." />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </PlatformShellCard>
        </div>
    )
}

import Link from 'next/link'
import { getBillingOverview } from '@/lib/platform/data'
import { normalizeFeatureKeys } from '@/lib/platform/types'
import {
    EmptyState,
    MetricTile,
    Panel,
    PanelHeader,
    PageHeader,
    StatusPill,
    TableShell,
    Td,
    Th,
    formatCurrency,
    formatCurrencyCompact,
    formatDate,
    tenantStatusTone,
} from '@/components/platform/ui'

export const metadata = { title: 'Billing' }
export const dynamic = 'force-dynamic'

export default async function BillingPage() {
    const { plans, planStats, tenants, invoices } = await getBillingOverview()

    const billing = tenants.filter((tenant) => tenant.subscription?.status === 'active')
    const trialing = tenants.filter((tenant) => tenant.subscription?.status === 'trialing')
    const pastDue = tenants.filter((tenant) => tenant.subscription?.status === 'past_due')
    const mrr = billing.reduce((total, tenant) => total + tenant.mrr, 0)

    // Pipeline is what MRR would become if every current trial converted at
    // its current plan price. Kept visibly separate from MRR.
    const pipeline = trialing.reduce((total, tenant) => total + tenant.mrr, 0)

    return (
        <div className="p-rise flex flex-col gap-5">
            <PageHeader
                title="Billing"
                description="Subscription pricing across the network, and which tier is carrying the business."
            />

            <div className="p-panel overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--p-line-soft)] lg:grid-cols-4 lg:divide-y-0">
                    <MetricTile
                        label="MRR"
                        value={formatCurrencyCompact(mrr)}
                        footnote={`${billing.length} billing ${billing.length === 1 ? 'tenant' : 'tenants'}`}
                    />
                    <MetricTile
                        label="Trial pipeline"
                        value={formatCurrencyCompact(pipeline)}
                        footnote={`${trialing.length} on trial, not yet billing`}
                        tone={trialing.length > 0 ? 'warn' : undefined}
                    />
                    <MetricTile
                        label="Past due"
                        value={String(pastDue.length)}
                        footnote="Failed recurring charges"
                        tone={pastDue.length > 0 ? 'danger' : undefined}
                    />
                    <MetricTile
                        label="Avg revenue"
                        value={billing.length > 0 ? formatCurrencyCompact(mrr / billing.length) : '₹0'}
                        footnote="Per billing tenant, monthly"
                    />
                </div>
            </div>

            <Panel padded={false}>
                <div className="p-4 pb-3">
                    <PanelHeader
                        title="Plans"
                        description="Prices here are the list price. A tenant's rate is copied onto its subscription when the plan is assigned, so changing a price does not re-rate existing tenants."
                    />
                </div>

                {plans.length === 0 ? (
                    <EmptyState
                        title="No plans defined"
                        description="Subscription tiers live in platform_subscription_plans. Add one to start assigning tenants to it."
                    />
                ) : (
                    <TableShell>
                        <thead>
                            <tr>
                                <Th>Plan</Th>
                                <Th>Entitlements</Th>
                                <Th align="right">Monthly</Th>
                                <Th align="right">Annual</Th>
                                <Th align="right">Trial</Th>
                                <Th align="right">Grace</Th>
                                <Th align="right">Tenants</Th>
                                <Th align="right">MRR</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {plans.map((plan) => {
                                const stats = planStats.get(plan.id) ?? { tenants: 0, mrr: 0 }
                                const features = normalizeFeatureKeys(plan.features)

                                return (
                                    <tr key={plan.id} className="p-row">
                                        <Td>
                                            <span className="font-medium text-[var(--p-ink)]">{plan.name}</span>
                                            <span className="p-num mt-0.5 block text-[11.5px] text-[var(--p-ink-3)]">
                                                {plan.code}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="p-num block text-[11.5px] text-[var(--p-ink-2)]">
                                                {plan.max_members === null ? '∞' : plan.max_members} members
                                                {' · '}
                                                {plan.max_staff === null ? '∞' : plan.max_staff} staff
                                            </span>
                                            <span className="mt-1 flex flex-wrap gap-1">
                                                {features.length === 0 ? (
                                                    <span className="text-[11px] text-[var(--p-ink-3)]">
                                                        No feature keys
                                                    </span>
                                                ) : (
                                                    features.map((feature) => (
                                                        <span
                                                            key={feature}
                                                            className="p-num rounded-full bg-[var(--p-surface-2)] px-2 py-0.5 text-[10.5px] text-[var(--p-ink-2)]"
                                                        >
                                                            {feature}
                                                        </span>
                                                    ))
                                                )}
                                            </span>
                                        </Td>
                                        <Td align="right" numeric>
                                            {formatCurrency(plan.price_monthly)}
                                        </Td>
                                        <Td align="right" numeric>
                                            {formatCurrency(plan.price_annual)}
                                        </Td>
                                        <Td align="right" numeric>
                                            {plan.trial_days}d
                                        </Td>
                                        <Td align="right" numeric>
                                            {plan.grace_period_days}d
                                        </Td>
                                        <Td align="right" numeric>
                                            {stats.tenants}
                                        </Td>
                                        <Td align="right" numeric>
                                            {stats.mrr > 0 ? formatCurrency(stats.mrr) : '—'}
                                        </Td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </TableShell>
                )}
            </Panel>

            <Panel padded={false}>
                <div className="p-4 pb-3">
                    <PanelHeader
                        title="Subscriptions"
                        description="Every tenant's current billing state. Edit a subscription from its tenant page."
                    />
                </div>

                {tenants.length === 0 ? (
                    <EmptyState
                        title="No subscriptions"
                        description="A subscription row is created for each gym at signup. None exist yet."
                    />
                ) : (
                    <TableShell>
                        <thead>
                            <tr>
                                <Th>Tenant</Th>
                                <Th>Plan</Th>
                                <Th>State</Th>
                                <Th>Interval</Th>
                                <Th align="right">Discount</Th>
                                <Th align="right">Monthly</Th>
                                <Th align="right">Renews</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map((tenant) => {
                                const subscription = tenant.subscription
                                const state = tenantStatusTone(subscription?.status ?? 'unknown')

                                return (
                                    <tr key={tenant.id} className="p-row">
                                        <Td>
                                            <Link
                                                href={`/platform/tenants/${tenant.id}`}
                                                className="font-medium text-[var(--p-ink)] hover:text-[var(--p-accent-wash-ink)]"
                                            >
                                                {tenant.name}
                                            </Link>
                                        </Td>
                                        <Td>{subscription?.plan?.name ?? '—'}</Td>
                                        <Td>
                                            {subscription ? (
                                                <StatusPill tone={state.tone}>{state.label}</StatusPill>
                                            ) : (
                                                <span className="text-[var(--p-ink-3)]">No subscription</span>
                                            )}
                                        </Td>
                                        <Td>{subscription?.billing_interval ?? '—'}</Td>
                                        <Td align="right" numeric>
                                            {Number(subscription?.discount_percentage ?? 0) > 0
                                                ? `${subscription?.discount_percentage}%`
                                                : '—'}
                                        </Td>
                                        <Td align="right" numeric>
                                            {subscription?.status === 'active' ? formatCurrency(tenant.mrr) : '—'}
                                        </Td>
                                        <Td align="right" numeric>
                                            {formatDate(subscription?.current_period_end)}
                                        </Td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </TableShell>
                )}
            </Panel>

            <Panel padded={false}>
                <div className="p-4 pb-3">
                    <PanelHeader title="Recent invoices" />
                </div>
                {invoices.length === 0 ? (
                    <EmptyState
                        title="No invoices issued"
                        description="Platform invoices are written by the payment-gateway webhook. Connect recurring billing to populate this."
                    />
                ) : (
                    <TableShell>
                        <thead>
                            <tr>
                                <Th>Invoice</Th>
                                <Th>Status</Th>
                                <Th align="right">Due</Th>
                                <Th align="right">Paid</Th>
                                <Th align="right">Issued</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="p-row">
                                    <Td numeric>{invoice.invoice_number}</Td>
                                    <Td>
                                        <StatusPill
                                            tone={
                                                invoice.status === 'paid'
                                                    ? 'ok'
                                                    : invoice.status === 'failed'
                                                      ? 'danger'
                                                      : 'idle'
                                            }
                                        >
                                            {invoice.status}
                                        </StatusPill>
                                    </Td>
                                    <Td align="right" numeric>
                                        {formatCurrency(invoice.amount_due)}
                                    </Td>
                                    <Td align="right" numeric>
                                        {formatCurrency(invoice.amount_paid)}
                                    </Td>
                                    <Td align="right" numeric>
                                        {formatDate(invoice.issued_at)}
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </TableShell>
                )}
            </Panel>
        </div>
    )
}

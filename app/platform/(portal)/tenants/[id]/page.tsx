import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconArrowLeft, IconCheck, IconMinus } from '@tabler/icons-react'
import { getTenantDetail } from '@/lib/platform/data'
import { getSubscriptionView } from '@/lib/billing/subscription'
import { daysUntil, formatPlatformRole } from '@/lib/platform/types'
import { getPlatformSession, roleCan } from '@/lib/platform/auth'
import {
    completeTenantOnboarding,
    saveTenantNotes,
    setFeatureOverride,
    setTenantStatus,
    startImpersonation,
    updateTenantSubscription,
} from '@/app/platform/actions'
import {
    Button,
    EmptyState,
    Field,
    Panel,
    PanelHeader,
    StatusPill,
    TableShell,
    Td,
    Th,
    formatCurrency,
    formatDate,
    formatRelative,
    tenantStatusTone,
} from '@/components/platform/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { tenant } = await getTenantDetail(id)
    return { title: tenant?.name ?? 'Tenant' }
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--p-line-soft)] py-2 last:border-b-0">
            <dt className="text-[12.5px] text-[var(--p-ink-3)]">{label}</dt>
            <dd className="min-w-0 text-right text-[12.5px] text-[var(--p-ink)]">{children}</dd>
        </div>
    )
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [{ tenant, plans, invoices, staff, flags, audit }, session] = await Promise.all([
        getTenantDetail(id),
        getPlatformSession(),
    ])

    if (!tenant || !session.admin) notFound()

    // Same derivation the tenant sees on their own billing page, so the two
    // portals can never disagree about whether a subscription is live.
    const billing = await getSubscriptionView(id)

    const status = tenantStatusTone(tenant.platform_status)
    const onboarding = tenantStatusTone(tenant.onboarding_status)
    const trialLeft = daysUntil(tenant.trial_ends_at ?? tenant.subscription?.trial_ends_at)
    const isDark = tenant.platform_status === 'suspended' || tenant.platform_status === 'cancelled'

    const canWriteTenant = roleCan(session.admin.role, 'tenant:write')
    const canImpersonate = roleCan(session.admin.role, 'impersonate')
    const canBill = roleCan(session.admin.role, 'billing:write')
    const canFlags = roleCan(session.admin.role, 'flags:write')

    // The onboarding gate from the architecture plan: contact route plus a
    // claimed subdomain. Everything else stays optional.
    const onboardingChecklist = [
        { label: 'Contact email', done: Boolean(tenant.contact_email) },
        { label: 'Contact phone', done: Boolean(tenant.contact_phone) },
        { label: 'Subdomain claimed', done: Boolean(tenant.subdomain) },
    ]
    const onboardingReady = onboardingChecklist.every((item) => item.done)

    return (
        <div className="p-rise flex flex-col gap-5">
            <div>
                <Link
                    href="/platform/tenants"
                    className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--p-ink-3)] transition-colors hover:text-[var(--p-ink)]"
                >
                    <IconArrowLeft size={13} stroke={1.8} aria-hidden="true" />
                    All tenants
                </Link>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[var(--p-ink)]">
                                {tenant.name}
                            </h1>
                            <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </div>
                        <p className="mt-1 text-[13px] text-[var(--p-ink-3)]">
                            {tenant.subdomain ? `${tenant.subdomain}.gmscloud.app` : 'No subdomain claimed'}
                            {tenant.city ? ` · ${tenant.city}` : ''}
                            {' · joined '}
                            {formatDate(tenant.created_at)}
                        </p>
                    </div>
                </div>
            </div>

            {tenant.suspension_reason ? (
                <div className="rounded-[var(--p-r-core)] border border-[var(--p-danger)] bg-[var(--p-danger-wash)] px-4 py-3">
                    <p className="text-[12.5px] leading-[1.55] text-[var(--p-danger-ink)]">
                        <strong className="font-semibold">
                            {tenant.platform_status === 'cancelled' ? 'Cancelled' : 'Suspended'}
                        </strong>{' '}
                        {formatRelative(tenant.suspended_at)} — {tenant.suspension_reason}
                    </p>
                </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                {/* ── main column ───────────────────────────────────────── */}
                <div className="flex flex-col gap-5">
                    <Panel>
                        <PanelHeader title="Subscription" />

                        <dl className="mb-4">
                            <DetailRow label="Plan">
                                {tenant.subscription?.plan?.name ?? 'No plan assigned'}
                            </DetailRow>
                            <DetailRow label="Lifecycle">
                                <StatusPill
                                    tone={
                                        billing.tone === 'ok'
                                            ? 'ok'
                                            : billing.tone === 'danger'
                                              ? 'danger'
                                              : billing.tone === 'warn'
                                                ? 'warn'
                                                : billing.tone === 'info'
                                                  ? 'accent'
                                                  : 'idle'
                                    }
                                >
                                    {billing.label}
                                </StatusPill>
                            </DetailRow>
                            <DetailRow label="Stored status">
                                {tenant.subscription ? (
                                    <StatusPill tone={tenantStatusTone(tenant.subscription.status).tone}>
                                        {tenantStatusTone(tenant.subscription.status).label}
                                    </StatusPill>
                                ) : (
                                    '—'
                                )}
                            </DetailRow>
                            <DetailRow label="Usage vs plan">
                                <span className="p-num">
                                    {billing.usage.members}/
                                    {billing.usage.memberLimit ?? '∞'} members
                                </span>
                                <span className="p-num ml-2 text-[var(--p-ink-3)]">
                                    {billing.usage.staff}/{billing.usage.staffLimit ?? '∞'} staff
                                </span>
                            </DetailRow>
                            <DetailRow label="Interval">
                                {tenant.subscription?.billing_interval ?? '—'}
                            </DetailRow>
                            <DetailRow label="Monthly equivalent">
                                <span className="p-num">{formatCurrency(tenant.mrr)}</span>
                                {tenant.subscription?.status !== 'active' ? (
                                    <span className="ml-1.5 text-[11.5px] text-[var(--p-ink-3)]">
                                        not billing
                                    </span>
                                ) : null}
                            </DetailRow>
                            {Number(tenant.subscription?.discount_percentage ?? 0) > 0 ? (
                                <DetailRow label="Discount">
                                    <span className="p-num">{tenant.subscription?.discount_percentage}%</span>
                                </DetailRow>
                            ) : null}
                            <DetailRow label="Trial ends">
                                {tenant.subscription?.trial_ends_at || tenant.trial_ends_at ? (
                                    <>
                                        <span className="p-num">
                                            {formatDate(tenant.trial_ends_at ?? tenant.subscription?.trial_ends_at)}
                                        </span>
                                        {trialLeft !== null ? (
                                            <span className="ml-1.5 text-[11.5px] text-[var(--p-ink-3)]">
                                                {trialLeft < 0 ? `${Math.abs(trialLeft)}d over` : `${trialLeft}d left`}
                                            </span>
                                        ) : null}
                                    </>
                                ) : (
                                    '—'
                                )}
                            </DetailRow>
                            <DetailRow label="Failed payments">
                                <span className="p-num">{tenant.subscription?.failed_payment_count ?? 0}</span>
                            </DetailRow>
                        </dl>

                        {canBill && tenant.subscription ? (
                            <details className="group border-t border-[var(--p-line)] pt-3">
                                <summary className="cursor-pointer list-none text-[12.5px] font-medium text-[var(--p-accent-wash-ink)] hover:text-[var(--p-accent)]">
                                    Change plan or billing
                                </summary>
                                <form action={updateTenantSubscription} className="mt-3 flex flex-col gap-3">
                                    <input type="hidden" name="gymId" value={tenant.id} />

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Plan" name="planId">
                                            <select
                                                id="planId"
                                                name="planId"
                                                defaultValue={tenant.subscription.plan_id ?? ''}
                                                className="p-input"
                                            >
                                                {plans.map((plan) => (
                                                    <option key={plan.id} value={plan.id}>
                                                        {plan.name} — {formatCurrency(plan.price_monthly)}/mo
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>

                                        <Field label="Interval" name="billingInterval">
                                            <select
                                                id="billingInterval"
                                                name="billingInterval"
                                                defaultValue={tenant.subscription.billing_interval}
                                                className="p-input"
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="annual">Annual</option>
                                            </select>
                                        </Field>

                                        <Field label="Billing state" name="status">
                                            <select
                                                id="status"
                                                name="status"
                                                defaultValue={tenant.subscription.status}
                                                className="p-input"
                                            >
                                                <option value="trialing">Trialing</option>
                                                <option value="active">Active</option>
                                                <option value="past_due">Past due</option>
                                                <option value="paused">Paused</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </Field>

                                        <Field
                                            label="Discount %"
                                            name="discountPercentage"
                                            hint="Recorded in the audit trail."
                                        >
                                            <input
                                                id="discountPercentage"
                                                name="discountPercentage"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={1}
                                                defaultValue={Number(tenant.subscription.discount_percentage ?? 0)}
                                                className="p-input"
                                            />
                                        </Field>
                                    </div>

                                    <div>
                                        <Button type="submit" tone="primary" size="sm">
                                            Save billing changes
                                        </Button>
                                    </div>
                                </form>
                            </details>
                        ) : null}
                    </Panel>

                    <Panel padded={false}>
                        <div className="p-4 pb-3">
                            <PanelHeader
                                title="Feature access"
                                description="An override wins over the platform default. Inherit removes the override entirely."
                            />
                        </div>

                        <TableShell>
                            <thead>
                                <tr>
                                    <Th>Feature</Th>
                                    <Th>Platform default</Th>
                                    <Th>This tenant</Th>
                                    {canFlags ? <Th align="right">Set</Th> : null}
                                </tr>
                            </thead>
                            <tbody>
                                {flags.map((flag) => (
                                    <tr key={flag.id} className="p-row">
                                        <Td>
                                            <span className="p-num text-[12.5px] font-medium text-[var(--p-ink)]">
                                                {flag.key}
                                            </span>
                                            {flag.description ? (
                                                <span className="mt-0.5 block text-[11.5px] text-[var(--p-ink-3)]">
                                                    {flag.description}
                                                </span>
                                            ) : null}
                                        </Td>
                                        <Td>{flag.is_enabled ? 'On' : 'Off'}</Td>
                                        <Td>
                                            <StatusPill tone={flag.effective ? 'ok' : 'idle'}>
                                                {flag.effective ? 'Enabled' : 'Disabled'}
                                            </StatusPill>
                                            {flag.override ? (
                                                <span className="mt-1 block text-[11px] text-[var(--p-ink-3)]">
                                                    overridden
                                                </span>
                                            ) : null}
                                        </Td>
                                        {canFlags ? (
                                            <Td align="right">
                                                <form
                                                    action={setFeatureOverride}
                                                    className="flex items-center justify-end gap-1.5"
                                                >
                                                    <input type="hidden" name="gymId" value={tenant.id} />
                                                    <input type="hidden" name="flagId" value={flag.id} />
                                                    <label
                                                        className="sr-only"
                                                        htmlFor={`value-${flag.id}`}
                                                    >
                                                        Override for {flag.key}
                                                    </label>
                                                    <select
                                                        id={`value-${flag.id}`}
                                                        name="value"
                                                        defaultValue={
                                                            flag.override
                                                                ? flag.override.is_enabled
                                                                    ? 'on'
                                                                    : 'off'
                                                                : 'inherit'
                                                        }
                                                        className="p-input h-8 w-[104px] text-[12px]"
                                                    >
                                                        <option value="inherit">Inherit</option>
                                                        <option value="on">Force on</option>
                                                        <option value="off">Force off</option>
                                                    </select>
                                                    <Button type="submit" size="sm" tone="secondary">
                                                        Apply
                                                    </Button>
                                                </form>
                                            </Td>
                                        ) : null}
                                    </tr>
                                ))}
                            </tbody>
                        </TableShell>
                    </Panel>

                    <Panel padded={false}>
                        <div className="p-4 pb-3">
                            <PanelHeader title="Platform invoices" />
                        </div>
                        {invoices.length === 0 ? (
                            <EmptyState
                                title="No invoices yet"
                                description="Subscription invoices appear here once recurring billing is connected to the payment gateway."
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

                {/* ── side column ───────────────────────────────────────── */}
                <div className="flex flex-col gap-5">
                    <Panel>
                        <PanelHeader title="Onboarding" />
                        <div className="mb-3 flex items-center gap-2">
                            <StatusPill tone={onboarding.tone}>{onboarding.label}</StatusPill>
                            {tenant.onboarding_status !== 'completed' ? (
                                <span className="text-[11.5px] text-[var(--p-ink-3)]">
                                    Basic features only
                                </span>
                            ) : null}
                        </div>

                        <ul className="mb-3 flex flex-col gap-1.5">
                            {onboardingChecklist.map((item) => (
                                <li key={item.label} className="flex items-center gap-2 text-[12.5px]">
                                    <span
                                        aria-hidden="true"
                                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            background: item.done ? 'var(--p-ok-wash)' : 'var(--p-idle-wash)',
                                            color: item.done ? 'var(--p-ok-ink)' : 'var(--p-ink-3)',
                                        }}
                                    >
                                        {item.done ? (
                                            <IconCheck size={10} stroke={2.6} />
                                        ) : (
                                            <IconMinus size={10} stroke={2.6} />
                                        )}
                                    </span>
                                    <span
                                        className={
                                            item.done ? 'text-[var(--p-ink-2)]' : 'text-[var(--p-ink-3)]'
                                        }
                                    >
                                        {item.label}
                                    </span>
                                    <span className="sr-only">{item.done ? 'complete' : 'outstanding'}</span>
                                </li>
                            ))}
                        </ul>

                        {tenant.onboarding_status !== 'completed' && canWriteTenant ? (
                            <form action={completeTenantOnboarding}>
                                <input type="hidden" name="gymId" value={tenant.id} />
                                <Button
                                    type="submit"
                                    tone="primary"
                                    size="sm"
                                    disabled={!onboardingReady}
                                    className="w-full"
                                >
                                    {onboardingReady ? 'Mark onboarding complete' : 'Waiting on the gym'}
                                </Button>
                            </form>
                        ) : null}
                    </Panel>

                    <Panel>
                        <PanelHeader title="Contact" />
                        <dl>
                            <DetailRow label="Business">{tenant.business_name ?? tenant.name}</DetailRow>
                            <DetailRow label="Email">{tenant.contact_email ?? 'Not provided'}</DetailRow>
                            <DetailRow label="Phone">
                                <span className="p-num">{tenant.contact_phone ?? 'Not provided'}</span>
                            </DetailRow>
                            <DetailRow label="Members">
                                <span className="p-num">{tenant.memberCount}</span>
                            </DetailRow>
                            <DetailRow label="Staff">
                                <span className="p-num">{tenant.staffCount}</span>
                            </DetailRow>
                        </dl>
                    </Panel>

                    {canImpersonate ? (
                        <Panel>
                            <PanelHeader
                                title="Support session"
                                description="Opens the gym workspace as support. Time-boxed to 2 hours and fully audited."
                            />
                            <form action={startImpersonation} className="flex flex-col gap-3">
                                <input type="hidden" name="gymId" value={tenant.id} />
                                <Field
                                    label="Reason"
                                    name="reason"
                                    hint="Recorded against your account. Minimum 8 characters."
                                >
                                    <input
                                        id="reason"
                                        name="reason"
                                        type="text"
                                        required
                                        minLength={8}
                                        placeholder="Ticket 412: payments not saving"
                                        className="p-input"
                                    />
                                </Field>
                                <Button type="submit" tone="secondary" size="sm" disabled={isDark}>
                                    {isDark ? 'Tenant is not active' : 'Open support session'}
                                </Button>
                            </form>
                        </Panel>
                    ) : null}

                    {canWriteTenant ? (
                        <Panel>
                            <PanelHeader title="Lifecycle" />

                            {isDark ? (
                                <form action={setTenantStatus} className="flex flex-col gap-3">
                                    <input type="hidden" name="gymId" value={tenant.id} />
                                    <input type="hidden" name="status" value="active" />
                                    <p className="text-[12.5px] leading-[1.55] text-[var(--p-ink-3)]">
                                        Reactivating restores staff and member sign-in immediately. No tenant
                                        data was deleted while suspended.
                                    </p>
                                    <Button type="submit" tone="primary" size="sm">
                                        Reactivate tenant
                                    </Button>
                                </form>
                            ) : (
                                <details className="group">
                                    <summary className="cursor-pointer list-none text-[12.5px] font-medium text-[var(--p-danger-ink)] hover:underline">
                                        Suspend this tenant
                                    </summary>
                                    <form action={setTenantStatus} className="mt-3 flex flex-col gap-3">
                                        <input type="hidden" name="gymId" value={tenant.id} />
                                        <p className="text-[12.5px] leading-[1.55] text-[var(--p-ink-3)]">
                                            Blocks staff and member sign-in for this gym. Data is retained and
                                            the action is reversible.
                                        </p>
                                        <Field label="Status" name="status">
                                            <select id="status" name="status" className="p-input" defaultValue="suspended">
                                                <option value="suspended">Suspend</option>
                                                <option value="cancelled">Cancel</option>
                                            </select>
                                        </Field>
                                        <Field label="Reason" name="reason" hint="Shown to other operators.">
                                            <input
                                                id="reason"
                                                name="reason"
                                                type="text"
                                                required
                                                placeholder="Non-payment after 3 attempts"
                                                className="p-input"
                                            />
                                        </Field>
                                        <Button type="submit" tone="danger" size="sm">
                                            Apply to {tenant.name}
                                        </Button>
                                    </form>
                                </details>
                            )}
                        </Panel>
                    ) : null}

                    <Panel>
                        <PanelHeader title="Staff" />
                        {staff.length === 0 ? (
                            <p className="text-[12.5px] text-[var(--p-ink-3)]">
                                No staff accounts on this gym yet.
                            </p>
                        ) : (
                            <ul className="flex flex-col">
                                {staff.map((member) => (
                                    <li
                                        key={member.id}
                                        className="flex items-baseline justify-between gap-3 border-b border-[var(--p-line-soft)] py-2 last:border-b-0"
                                    >
                                        <span className="truncate text-[12.5px] text-[var(--p-ink)]">
                                            {member.full_name ?? 'Unnamed'}
                                        </span>
                                        <span className="shrink-0 text-[11.5px] text-[var(--p-ink-3)]">
                                            {formatPlatformRole(member.role as never)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    {canWriteTenant ? (
                        <Panel>
                            <PanelHeader title="Operator notes" description="Visible to platform staff only." />
                            <form action={saveTenantNotes} className="flex flex-col gap-3">
                                <input type="hidden" name="gymId" value={tenant.id} />
                                <label htmlFor="notes" className="sr-only">
                                    Operator notes
                                </label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={4}
                                    defaultValue={tenant.platform_notes ?? ''}
                                    placeholder="Context the next operator will need."
                                    className="p-input h-auto resize-y py-2 leading-[1.55]"
                                />
                                <Button type="submit" tone="secondary" size="sm">
                                    Save notes
                                </Button>
                            </form>
                        </Panel>
                    ) : null}

                    <Panel padded={false}>
                        <div className="p-4 pb-2">
                            <PanelHeader title="Activity" />
                        </div>
                        {audit.length === 0 ? (
                            <EmptyState
                                title="Nothing recorded yet"
                                description="Status changes, billing edits, and support sessions for this tenant will appear here."
                            />
                        ) : (
                            <ul>
                                {audit.map((entry) => (
                                    <li
                                        key={entry.id}
                                        className="flex items-baseline gap-3 border-t border-[var(--p-line-soft)] px-4 py-2"
                                    >
                                        <span className="p-num min-w-0 flex-1 truncate text-[11.5px] text-[var(--p-ink-2)]">
                                            {entry.action}
                                        </span>
                                        <span className="shrink-0 text-[11px] text-[var(--p-ink-3)]">
                                            {formatRelative(entry.created_at)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    )
}

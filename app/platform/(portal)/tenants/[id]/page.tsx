import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconArrowLeft, IconCheck, IconMinus } from '@tabler/icons-react'
import { getTenantDetail } from '@/lib/platform/data'
import { getSubscriptionView } from '@/lib/billing/subscription'
import { daysUntil, formatPlatformRole } from '@/lib/platform/types'
import { getPlatformSession, roleCan } from '@/lib/platform/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
    completeTenantOnboarding,
    retryImpersonationCleanup,
    saveTenantNotes,
    setTenantStatus,
    startImpersonation,
    stopImpersonation,
    updateTenantSubscription,
} from '@/app/platform/actions'
import FlagOverrideCell from '@/components/platform/FlagOverrideCell'
import SessionCountdown from '@/components/platform/SessionCountdown'
import { ResumeSessionButton, SessionSubmitButton } from '@/components/platform/SupportSessionControls'
import {
    Button,
    EmptyState,
    Field,
    MetricTile,
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

    // Sessions whose revert failed on stop: still open (never marked
    // reverted) but carrying an error, so they need an operator to retry.
    const pendingResult = await getSupabaseAdmin()
        .from('platform_impersonation_sessions')
        .select('id, started_at, revert_error')
        .eq('gym_id', tenant.id)
        .is('reverted_at', null)
        .not('revert_error', 'is', null)
        .order('started_at', { ascending: false })
    const pendingCleanup = (pendingResult.data ?? []) as {
        id: string
        started_at: string
        revert_error: string
    }[]

    const status = tenantStatusTone(tenant.platform_status)
    const onboarding = tenantStatusTone(tenant.onboarding_status)
    const trialLeft = daysUntil(tenant.trial_ends_at ?? tenant.subscription?.trial_ends_at)
    const isDark = tenant.platform_status === 'suspended' || tenant.platform_status === 'cancelled'

    const canWriteTenant = roleCan(session.admin.role, 'tenant:write')
    const canImpersonate = roleCan(session.admin.role, 'impersonate')
    const canBill = roleCan(session.admin.role, 'billing:write')
    const canFlags = roleCan(session.admin.role, 'flags:write')

    const openSession = session.impersonation
    const openSessionIsHere = openSession?.gym_id === tenant.id

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

            {/* The numbers an operator opens this page to check, lifted out of
                the detail lists into one strip. Same hairline-tile grid as the
                tenants directory, so the two pages read as one product, and it
                gives the page a full-width top edge to hang the columns from. */}
            <div className="p-panel overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-[var(--p-line-soft)] sm:grid-cols-3 lg:grid-cols-5">
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Monthly"
                            value={formatCurrency(tenant.mrr)}
                            footnote={
                                tenant.subscription?.status === 'active' ? 'Billing' : 'Not billing'
                            }
                        />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Members"
                            value={String(billing.usage.members)}
                            footnote={`of ${billing.usage.memberLimit ?? '∞'}`}
                        />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Staff"
                            value={String(billing.usage.staff)}
                            footnote={`of ${billing.usage.staffLimit ?? '∞'}`}
                        />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Trial"
                            value={
                                trialLeft === null
                                    ? '—'
                                    : trialLeft < 0
                                      ? `${Math.abs(trialLeft)}d`
                                      : `${trialLeft}d`
                            }
                            tone={trialLeft !== null && trialLeft <= 3 ? 'warn' : undefined}
                            footnote={
                                trialLeft === null
                                    ? 'No trial'
                                    : trialLeft < 0
                                      ? 'Over'
                                      : `Ends ${formatDate(
                                            tenant.trial_ends_at ?? tenant.subscription?.trial_ends_at,
                                        )}`
                            }
                        />
                    </div>
                    <div className="col-span-2 bg-[var(--p-surface)] sm:col-span-1">
                        <MetricTile
                            label="Failed payments"
                            value={String(tenant.subscription?.failed_payment_count ?? 0)}
                            tone={
                                Number(tenant.subscription?.failed_payment_count ?? 0) > 0
                                    ? 'danger'
                                    : undefined
                            }
                            footnote={
                                Number(tenant.subscription?.failed_payment_count ?? 0) > 0
                                    ? 'Needs attention'
                                    : 'None recorded'
                            }
                        />
                    </div>
                </div>
            </div>

            {/* items-start keeps each panel at its natural height: without it
                the grid stretches the shorter column's last panel to match the
                taller one, which is the empty box this layout used to show.

                Both tracks are minmax(0,...) and both columns carry min-w-0,
                including the single stacked column on phones. A grid item
                defaults to min-width:auto, which means it refuses to shrink
                below its widest content: the tables inside then widened this
                grid past the viewport and took the page background with them,
                rather than scrolling inside their own wrapper. */}
            <div className="grid items-start gap-5 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* ── main column ───────────────────────────────────────── */}
                <div className="flex min-w-0 flex-col gap-5">
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
                            {/* Rows that only exist when there is a subscription
                                row to read them from. Printing "—" for each was
                                three dead lines in a list of nine, which made
                                the panel look broken rather than empty. The
                                figures that used to sit here (usage, monthly,
                                trial, failed payments) are in the strip above. */}
                            {tenant.subscription ? (
                                <>
                                    <DetailRow label="Stored status">
                                        <StatusPill
                                            tone={tenantStatusTone(tenant.subscription.status).tone}
                                        >
                                            {tenantStatusTone(tenant.subscription.status).label}
                                        </StatusPill>
                                    </DetailRow>
                                    <DetailRow label="Interval">
                                        {tenant.subscription.billing_interval}
                                    </DetailRow>
                                    {Number(tenant.subscription.discount_percentage ?? 0) > 0 ? (
                                        <DetailRow label="Discount">
                                            <span className="p-num">
                                                {tenant.subscription.discount_percentage}%
                                            </span>
                                        </DetailRow>
                                    ) : null}
                                </>
                            ) : null}
                        </dl>

                        {tenant.subscription ? null : (
                            <p className="mb-4 text-[12.5px] leading-[1.55] text-[var(--p-ink-3)]">
                                No subscription record yet. The lifecycle above is derived from the
                                trial dates on the gym itself.
                            </p>
                        )}

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

                        {/* This table lives in the 1fr half of the detail grid,
                            so it has roughly 640px, not the full page. Four
                            columns fit that only if none of them is paying for
                            width it does not use: hence dense gutters, headers
                            short enough not to set a column's floor on their
                            own ("Platform default" was 112px of nowrap header
                            over a two-character value), and a select that stops
                            repeating the default column next to it. The floor
                            drops to the point where the columns genuinely stop
                            fitting, so the scrollbar is a phone affordance
                            again rather than a permanent fixture. */}
                        <TableShell minWidth={520} dense>
                            <thead>
                                <tr>
                                    <Th>Feature</Th>
                                    <Th hideInSqueeze>Default</Th>
                                    <Th>Status</Th>
                                    {canFlags ? <Th align="center">Set</Th> : null}
                                </tr>
                            </thead>
                            <tbody>
                                {flags.map((flag) => (
                                    <tr key={flag.id} className="p-row">
                                        {/* The one column that may wrap takes
                                            whatever the other three leave, so
                                            a long description reflows instead
                                            of pushing the table past the
                                            panel. */}
                                        <Td className="w-full">
                                            <span className="p-num text-[12.5px] font-medium text-[var(--p-ink)]">
                                                {flag.key}
                                            </span>
                                            {flag.description ? (
                                                <span className="mt-0.5 block text-[11.5px] text-[var(--p-ink-3)]">
                                                    {flag.description}
                                                </span>
                                            ) : null}
                                        </Td>
                                        {/* First column to go when the main
                                            column is at its narrowest: it
                                            carries the least per pixel, and
                                            the Status column beside it still
                                            says what the tenant actually
                                            gets. */}
                                        <Td hideInSqueeze className="whitespace-nowrap">
                                            {flag.is_enabled ? 'On' : 'Off'}
                                        </Td>
                                        <Td className="whitespace-nowrap">
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
                                            <Td align="center" className="whitespace-nowrap">
                                                {/* text-align does not move a
                                                    block-level form, so the
                                                    centring the header implies
                                                    still needs a flex row. */}
                                                <div className="flex justify-center">
                                                    <FlagOverrideCell
                                                        gymId={tenant.id}
                                                        flagId={flag.id}
                                                        flagKey={flag.key}
                                                        tenantName={tenant.name}
                                                        defaultEnabled={flag.is_enabled}
                                                        // The Default column
                                                        // one over already says
                                                        // what inherit follows.
                                                        showDefaultHint={false}
                                                        value={
                                                            flag.override
                                                                ? flag.override.is_enabled
                                                                    ? 'on'
                                                                    : 'off'
                                                                : 'inherit'
                                                        }
                                                    />
                                                </div>
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
                            <TableShell minWidth={600}>
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

                    {pendingCleanup.length > 0 ? (
                        <Panel padded={false}>
                            <div className="p-4 pb-2">
                                <PanelHeader
                                    title="Support session cleanup needed"
                                    description="These sessions ended but the demo rows they created could not be removed automatically."
                                />
                            </div>
                            <ul>
                                {pendingCleanup.map((s) => (
                                    <li
                                        key={s.id}
                                        className="flex items-center justify-between gap-4 border-t border-[var(--p-line-soft)] px-4 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[12.5px] text-[var(--p-ink-3)]">
                                                Session started {new Date(s.started_at).toLocaleString('en-IN')}
                                            </p>
                                            <p className="mt-0.5 text-[11.5px] text-[var(--p-danger)]">
                                                {s.revert_error}
                                            </p>
                                        </div>
                                        <form action={retryImpersonationCleanup.bind(null, s.id)}>
                                            <SessionSubmitButton pendingLabel="Retrying" tone="secondary">
                                                Retry cleanup
                                            </SessionSubmitButton>
                                        </form>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    ) : null}

                    {/* Activity sits in the main column, not the rail.

                        It is the one panel here that grows without bound, and
                        in a fixed-width rail it made that column run roughly a
                        third longer than this one, which is what left the large
                        blank under the invoices table. Moved across, the two
                        columns land within a panel's height of each other, and
                        a full-width audit line stops truncating action names. */}
                    <Panel padded={false}>
                        <div className="p-4 pb-2">
                            <PanelHeader
                                title="Activity"
                                description="Every platform action recorded against this tenant."
                            />
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

                {/* ── side column ───────────────────────────────────────── */}
                <div className="flex min-w-0 flex-col gap-5">
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
                            {/* Member and staff counts live in the strip at the
                                top. Carrying them here too meant the same two
                                numbers appeared three times on one page. */}
                        </dl>

                        {/* Who to contact and who can sign in are the same
                            question, so they share a panel rather than two
                            bordered boxes stacked against each other. A
                            hairline separates them; a second card would have
                            said they were unrelated. */}
                        <div className="mt-3 border-t border-[var(--p-line)] pt-3">
                            <p className="p-label mb-2">Staff accounts</p>
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
                        </div>
                    </Panel>

                    {canImpersonate ? (
                        <Panel>
                            {/* One session per admin at a time, and the DB row
                                outlives the tab: leaving the gym workspace by
                                any route other than End session keeps it open.
                                So while one exists this panel is about that
                                session (get back in, or close it), never a
                                form that would silently replace it. */}
                            {openSession && openSessionIsHere ? (
                                <>
                                    <PanelHeader
                                        title="Support session"
                                        description={
                                            <>
                                                Opened {formatRelative(openSession.started_at)}
                                                {openSession.reason ? ` — ${openSession.reason}` : ''}. Expires
                                                in{' '}
                                                <SessionCountdown
                                                    expiresAt={openSession.expires_at}
                                                    className="p-num"
                                                />
                                                .
                                            </>
                                        }
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <ResumeSessionButton tone="primary">Resume session</ResumeSessionButton>
                                        <form action={stopImpersonation}>
                                            <SessionSubmitButton pendingLabel="Ending">
                                                End session
                                            </SessionSubmitButton>
                                        </form>
                                    </div>
                                </>
                            ) : openSession ? (
                                <>
                                    <PanelHeader
                                        title="Support session"
                                        description={`You already have a session open on ${
                                            openSession.gymName ?? 'another tenant'
                                        }. End it before opening one here.`}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <ResumeSessionButton tone="secondary">
                                            Resume that session
                                        </ResumeSessionButton>
                                        <form action={stopImpersonation}>
                                            <SessionSubmitButton pendingLabel="Ending">
                                                End session
                                            </SessionSubmitButton>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                        <SessionSubmitButton pendingLabel="Opening" disabled={isDark}>
                                            {isDark ? 'Tenant is not active' : 'Open support session'}
                                        </SessionSubmitButton>
                                    </form>
                                </>
                            )}
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
                                    data-multiline="true"
                                    className="p-input resize-y leading-[1.55]"
                                />
                                <Button type="submit" tone="secondary" size="sm">
                                    Save notes
                                </Button>
                            </form>
                        </Panel>
                    ) : null}

                </div>
            </div>
        </div>
    )
}

import Link from 'next/link'
import { getBillingOverview } from '@/lib/platform/data'
import type { PlatformInvoiceStatus } from '@/lib/platform/types'
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

const INVOICE_FILTERS: Array<{ key: PlatformInvoiceStatus | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'paid', label: 'Paid' },
    { key: 'failed', label: 'Failed' },
]

function isInvoiceStatus(value: string | undefined): value is PlatformInvoiceStatus {
    return INVOICE_FILTERS.some((filter) => filter.key !== 'all' && filter.key === value)
}

/**
 * Grace is the countdown that matters on this list: when it hits zero the
 * subscription lapses on its own, so the last couple of days read as urgent.
 */
function describeGrace(daysLeft: number | null): { label: string; tone?: 'danger' } {
    if (daysLeft === null) return { label: '—' }
    if (daysLeft < 0) return { label: 'expired', tone: 'danger' }
    if (daysLeft === 0) return { label: 'ends today', tone: 'danger' }
    if (daysLeft <= 2) return { label: `${daysLeft}d left`, tone: 'danger' }
    return { label: `${daysLeft}d left` }
}

function invoiceTone(status: PlatformInvoiceStatus) {
    if (status === 'paid') return 'ok' as const
    if (status === 'failed') return 'danger' as const
    return 'idle' as const
}

export default async function BillingPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>
}) {
    const { status } = await searchParams
    const invoiceFilter = isInvoiceStatus(status) ? status : undefined
    const { metrics, collections, renewals, invoices } = await getBillingOverview(invoiceFilter)

    const atRisk = metrics.failedInvoices + metrics.pastDueTenants

    return (
        <div className="p-rise flex flex-col gap-5">
            <PageHeader
                title="Billing"
                description="Cash collected, cash outstanding, and which tenants need chasing. Pricing lives under Plans; the full roster under Tenants."
                action={
                    <Link
                        href="/platform/plans"
                        className="text-[12px] font-medium text-[var(--p-accent-wash-ink)] hover:underline"
                    >
                        Manage plans
                    </Link>
                }
            />

            <div className="p-panel overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-[var(--p-line-soft)] lg:grid-cols-4">
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Collected this month"
                            value={formatCurrencyCompact(metrics.collectedThisMonth)}
                            footnote={`${metrics.collectedCount} ${metrics.collectedCount === 1 ? 'invoice' : 'invoices'} paid`}
                        />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Outstanding"
                            value={formatCurrencyCompact(metrics.outstanding)}
                            footnote={`${metrics.outstandingCount} open ${metrics.outstandingCount === 1 ? 'invoice' : 'invoices'}`}
                            tone={metrics.outstanding > 0 ? 'warn' : undefined}
                        />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="At risk"
                            value={String(atRisk)}
                            footnote={`${metrics.failedInvoices} failed, ${metrics.pastDueTenants} past due`}
                            tone={atRisk > 0 ? 'danger' : undefined}
                        />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Trial pipeline"
                            value={formatCurrencyCompact(metrics.pipeline)}
                            footnote={`${metrics.trialing} on trial, not yet billing`}
                        />
                    </div>
                </div>
            </div>

            <Panel padded={false}>
                <div className="p-4 pb-3">
                    <PanelHeader
                        title="Needs collection"
                        description="Renewals that failed and are running on grace, plus any invoice past its due date. Once grace runs out the subscription lapses."
                    />
                </div>
                {collections.length === 0 ? (
                    <EmptyState
                        title="Nothing to chase"
                        description="No tenant is past due, has a failed charge, or is sitting on an overdue invoice."
                    />
                ) : (
                    <TableShell minWidth={720}>
                        <thead>
                            <tr>
                                <Th>Tenant</Th>
                                <Th>Plan</Th>
                                <Th>State</Th>
                                <Th align="right">Owed</Th>
                                <Th align="right">Grace</Th>
                                <Th align="right">Failed attempts</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {collections.map(({ tenant, owed, graceDaysLeft, failedAttempts }) => {
                                const state = tenantStatusTone(tenant.subscription?.status ?? 'unknown')
                                const grace = describeGrace(graceDaysLeft)
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
                                        <Td>{tenant.subscription?.plan?.name ?? '—'}</Td>
                                        <Td>
                                            <StatusPill tone={state.tone}>{state.label}</StatusPill>
                                        </Td>
                                        <Td align="right" numeric>
                                            {owed > 0 ? formatCurrency(owed) : '—'}
                                        </Td>
                                        <Td align="right" numeric>
                                            <span className={grace.tone === 'danger' ? 'text-[var(--p-danger-ink)]' : undefined}>
                                                {grace.label}
                                            </span>
                                        </Td>
                                        <Td align="right" numeric>
                                            {failedAttempts > 0 ? failedAttempts : '—'}
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
                        title="Renewing in the next 14 days"
                        description="Active subscriptions about to be charged again, and for how much."
                    />
                </div>
                {renewals.length === 0 ? (
                    <EmptyState
                        title="No renewals due"
                        description="No active subscription reaches the end of its billing period in the next two weeks."
                    />
                ) : (
                    <TableShell minWidth={680}>
                        <thead>
                            <tr>
                                <Th>Tenant</Th>
                                <Th>Plan</Th>
                                <Th>Interval</Th>
                                <Th align="right">Discount</Th>
                                <Th align="right">Amount</Th>
                                <Th align="right">Renews</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {renewals.map(({ tenant, amount, daysUntilRenewal }) => {
                                const subscription = tenant.subscription
                                const discount = Number(subscription?.discount_percentage ?? 0)
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
                                        <Td>{subscription?.billing_interval ?? '—'}</Td>
                                        <Td align="right" numeric>
                                            {discount > 0 ? `${discount}%` : '—'}
                                        </Td>
                                        <Td align="right" numeric>
                                            {formatCurrency(amount)}
                                        </Td>
                                        <Td align="right" numeric>
                                            {formatDate(subscription?.current_period_end)}
                                            <span className="ml-1.5 text-[11px] text-[var(--p-ink-3)]">
                                                {daysUntilRenewal === 0 ? 'today' : `in ${daysUntilRenewal}d`}
                                            </span>
                                        </Td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </TableShell>
                )}
            </Panel>

            <Panel padded={false}>
                <div className="flex flex-col gap-3 p-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
                    <PanelHeader title="Invoices" description="The 50 most recent platform invoices across every tenant." />
                    <div
                        role="group"
                        aria-label="Filter invoices by status"
                        className="flex shrink-0 flex-wrap items-center gap-1 self-start rounded-[var(--p-r-core)] bg-[var(--p-surface-2)] p-1"
                    >
                        {INVOICE_FILTERS.map((filter) => {
                            const selected = filter.key === 'all' ? !invoiceFilter : invoiceFilter === filter.key
                            return (
                                <Link
                                    key={filter.key}
                                    href={filter.key === 'all' ? '/platform/billing' : `/platform/billing?status=${filter.key}`}
                                    aria-pressed={selected}
                                    // The filter only swaps the table under it; jumping
                                    // back to the top of the page on every click would
                                    // make the operator scroll down again each time.
                                    scroll={false}
                                    className="p-seg"
                                >
                                    {filter.label}
                                </Link>
                            )
                        })}
                    </div>
                </div>
                {invoices.length === 0 ? (
                    <EmptyState
                        title={invoiceFilter ? `No ${invoiceFilter} invoices` : 'No invoices issued'}
                        description={
                            invoiceFilter
                                ? 'Nothing matches this filter among the most recent invoices.'
                                : 'Platform invoices are written by the payment-gateway webhook. Connect recurring billing to populate this.'
                        }
                    />
                ) : (
                    <TableShell minWidth={760}>
                        <thead>
                            <tr>
                                <Th>Invoice</Th>
                                <Th>Tenant</Th>
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
                                        <Link
                                            href={`/platform/tenants/${invoice.gym_id}`}
                                            className="font-medium text-[var(--p-ink)] hover:text-[var(--p-accent-wash-ink)]"
                                        >
                                            {invoice.tenantName}
                                        </Link>
                                    </Td>
                                    <Td>
                                        <StatusPill tone={invoiceTone(invoice.status)}>{invoice.status}</StatusPill>
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

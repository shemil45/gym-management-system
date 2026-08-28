import Link from 'next/link'
import { IconArrowRight } from '@tabler/icons-react'
import { getPlatformOverview } from '@/lib/platform/data'
import { daysUntil } from '@/lib/platform/types'
import VolumeChart from '@/components/platform/VolumeChart'
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
    formatRelative,
    tenantStatusTone,
} from '@/components/platform/ui'

export const metadata = { title: 'Overview' }

/** Always fresh: an operations console showing cached money is worse than slow. */
export const dynamic = 'force-dynamic'

type AlertRow = {
    gymId: string
    name: string
    detail: string
    tone: 'warn' | 'danger'
}

export default async function PlatformOverviewPage() {
    const { metrics, alerts, revenueSeries, tenants, recentAudit } = await getPlatformOverview()

    // One ranked lane instead of four separate alert panels: an operator wants
    // "what needs me today", not a taxonomy of problem types.
    const attention: AlertRow[] = [
        ...alerts.suspended.map((tenant) => ({
            gymId: tenant.id,
            name: tenant.name,
            detail: tenant.suspension_reason
                ? `Suspended — ${tenant.suspension_reason}`
                : 'Suspended',
            tone: 'danger' as const,
        })),
        ...alerts.pastDue.map((tenant) => ({
            gymId: tenant.id,
            name: tenant.name,
            detail: `Payment failed ${tenant.subscription?.failed_payment_count ?? 0}×`,
            tone: 'danger' as const,
        })),
        ...alerts.expiringTrials.map((tenant) => {
            const remaining = daysUntil(tenant.trial_ends_at ?? tenant.subscription?.trial_ends_at)
            return {
                gymId: tenant.id,
                name: tenant.name,
                detail:
                    remaining !== null && remaining < 0
                        ? `Trial ended ${Math.abs(remaining)}d ago`
                        : `Trial ends in ${remaining ?? 0}d`,
                tone: 'warn' as const,
            }
        }),
        ...alerts.incompleteOnboarding.map((tenant) => ({
            gymId: tenant.id,
            name: tenant.name,
            detail: `Onboarding ${tenant.onboarding_status.replace(/_/g, ' ')}`,
            tone: 'warn' as const,
        })),
    ]

    const topTenants = [...tenants].sort((a, b) => b.memberCount - a.memberCount).slice(0, 6)

    return (
        <div className="p-rise flex flex-col gap-5">
            <PageHeader
                title="Overview"
                description="Revenue, tenant health, and everything currently asking for attention across the network."
            />

            {/* Metric strip. Hairline-divided grid rather than six bordered
                cards, per the density rule. */}
            <div className="p-panel overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--p-line-soft)] sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
                    <MetricTile
                        label="MRR"
                        value={formatCurrencyCompact(metrics.mrr)}
                        footnote="Billing subscriptions only"
                    />
                    <MetricTile label="ARR" value={formatCurrencyCompact(metrics.arr)} footnote="MRR × 12" />
                    <MetricTile
                        label="Active"
                        value={String(metrics.activeTenants)}
                        unit={metrics.activeTenants === 1 ? 'tenant' : 'tenants'}
                        footnote={`${metrics.newTenants30d} joined in 30d`}
                    />
                    <MetricTile
                        label="On trial"
                        value={String(metrics.trialingTenants)}
                        footnote="Not counted in MRR"
                        tone={metrics.trialingTenants > 0 ? 'warn' : undefined}
                    />
                    <MetricTile
                        label="Churn"
                        value={`${metrics.churnRate.toFixed(1)}%`}
                        footnote="Cancelled ÷ ever-billable"
                        tone={metrics.churnRate > 5 ? 'danger' : undefined}
                    />
                    <MetricTile
                        label="Members"
                        value={metrics.totalMembers.toLocaleString('en-IN')}
                        footnote="Across all tenants"
                    />
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                <Panel>
                    <PanelHeader
                        title="Platform volume"
                        description="Payments collected by gyms on the platform over 30 days. This is tenant turnover, not platform revenue."
                    />
                    <p className="p-num mb-2 text-[19px] font-semibold tracking-[-0.02em] text-[var(--p-ink)]">
                        {formatCurrency(metrics.platformVolume30d)}
                    </p>
                    <VolumeChart data={revenueSeries} />
                </Panel>

                <Panel padded={false}>
                    <div className="p-4 pb-3">
                        <PanelHeader
                            title="Needs attention"
                            description={
                                attention.length > 0
                                    ? `${attention.length} ${attention.length === 1 ? 'item' : 'items'}, most urgent first.`
                                    : undefined
                            }
                        />
                    </div>

                    {attention.length === 0 ? (
                        <EmptyState
                            title="Nothing needs you"
                            description="No suspended tenants, failed payments, closing trials, or stalled onboarding across the network."
                        />
                    ) : (
                        <ul className="max-h-[298px] overflow-y-auto">
                            {attention.map((row, index) => (
                                <li key={`${row.gymId}-${index}`}>
                                    <Link
                                        href={`/platform/tenants/${row.gymId}`}
                                        className="p-row flex items-center gap-3 border-t border-[var(--p-line-soft)] px-4 py-2.5"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                                            style={{
                                                background:
                                                    row.tone === 'danger'
                                                        ? 'var(--p-danger)'
                                                        : 'var(--p-warn)',
                                            }}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-medium text-[var(--p-ink)]">
                                                {row.name}
                                            </span>
                                            <span className="block truncate text-[11.5px] text-[var(--p-ink-3)]">
                                                {row.detail}
                                            </span>
                                        </span>
                                        <IconArrowRight
                                            size={14}
                                            stroke={1.7}
                                            aria-hidden="true"
                                            className="shrink-0 text-[var(--p-ink-3)]"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                <Panel padded={false}>
                    <div className="p-4 pb-3">
                        <PanelHeader
                            title="Largest tenants"
                            description="By member count."
                            action={
                                <Link
                                    href="/platform/tenants"
                                    className="text-[12.5px] font-medium text-[var(--p-accent-wash-ink)] hover:text-[var(--p-accent)]"
                                >
                                    All tenants
                                </Link>
                            }
                        />
                    </div>

                    {topTenants.length === 0 ? (
                        <EmptyState
                            title="No tenants yet"
                            description="Gyms appear here as soon as they sign up. The first one will show its plan and member count."
                        />
                    ) : (
                        <TableShell>
                            <thead>
                                <tr>
                                    <Th>Tenant</Th>
                                    <Th>Status</Th>
                                    <Th align="right">Members</Th>
                                    <Th align="right">MRR</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {topTenants.map((tenant) => {
                                    const status = tenantStatusTone(tenant.platform_status)
                                    return (
                                        <tr key={tenant.id} className="p-row">
                                            <Td>
                                                <Link
                                                    href={`/platform/tenants/${tenant.id}`}
                                                    className="font-medium text-[var(--p-ink)] hover:text-[var(--p-accent-wash-ink)]"
                                                >
                                                    {tenant.name}
                                                </Link>
                                                <span className="mt-0.5 block text-[11.5px] text-[var(--p-ink-3)]">
                                                    {tenant.subscription?.plan?.name ?? 'No plan'}
                                                </span>
                                            </Td>
                                            <Td>
                                                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                            </Td>
                                            <Td align="right" numeric>
                                                {tenant.memberCount}
                                            </Td>
                                            <Td align="right" numeric>
                                                {tenant.subscription?.status === 'active'
                                                    ? formatCurrency(tenant.mrr)
                                                    : '—'}
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
                            title="Recent activity"
                            action={
                                <Link
                                    href="/platform/audit"
                                    className="text-[12.5px] font-medium text-[var(--p-accent-wash-ink)] hover:text-[var(--p-accent)]"
                                >
                                    Full log
                                </Link>
                            }
                        />
                    </div>

                    {recentAudit.length === 0 ? (
                        <EmptyState
                            title="No activity recorded"
                            description="Every status change, billing edit, flag toggle, and support session appears here as it happens."
                        />
                    ) : (
                        <ul>
                            {recentAudit.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="flex items-baseline gap-3 border-t border-[var(--p-line-soft)] px-4 py-2.5"
                                >
                                    <span className="p-num min-w-0 flex-1 truncate text-[12px] text-[var(--p-ink-2)]">
                                        {entry.action}
                                    </span>
                                    <span className="shrink-0 text-[11.5px] text-[var(--p-ink-3)]">
                                        {formatRelative(entry.created_at)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>
        </div>
    )
}

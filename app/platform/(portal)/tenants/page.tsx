import Link from 'next/link'
import { IconSearch } from '@tabler/icons-react'
import { getTenantSummaries } from '@/lib/platform/data'
import { PLATFORM_STATUS_ORDER, daysUntil } from '@/lib/platform/types'
import {
    Button,
    EmptyState,
    Panel,
    PageHeader,
    StatusPill,
    TableShell,
    Td,
    Th,
    formatCurrency,
    formatDate,
    tenantStatusTone,
} from '@/components/platform/ui'

export const metadata = { title: 'Tenants' }
export const dynamic = 'force-dynamic'

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'trialing', label: 'Trial' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'cancelled', label: 'Cancelled' },
] as const

export default async function TenantsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; status?: string }>
}) {
    const { q = '', status = 'all' } = await searchParams
    const all = await getTenantSummaries()

    const query = q.trim().toLowerCase()
    const tenants = all
        .filter((tenant) => (status === 'all' ? true : tenant.platform_status === status))
        .filter((tenant) => {
            if (!query) return true
            return [tenant.name, tenant.business_name, tenant.contact_email, tenant.subdomain, tenant.city]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(query)
        })
        // Most urgent lifecycle state first, then largest, so a suspended
        // tenant never hides on page two.
        .sort((a, b) => {
            const rank =
                PLATFORM_STATUS_ORDER.indexOf(a.platform_status) -
                PLATFORM_STATUS_ORDER.indexOf(b.platform_status)
            return rank !== 0 ? rank : b.memberCount - a.memberCount
        })

    const counts = new Map<string, number>()
    for (const tenant of all) {
        counts.set(tenant.platform_status, (counts.get(tenant.platform_status) ?? 0) + 1)
    }

    return (
        <div className="p-rise flex flex-col gap-5">
            <PageHeader
                title="Tenants"
                description={`${all.length} ${all.length === 1 ? 'gym' : 'gyms'} on the platform.`}
            />

            <Panel padded={false}>
                {/* Filters are links, not client state, so a filtered view is
                    shareable and survives a refresh. */}
                <div className="flex flex-col gap-3 border-b border-[var(--p-line)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {FILTERS.map((filter) => {
                            const active = status === filter.key
                            const count =
                                filter.key === 'all' ? all.length : counts.get(filter.key) ?? 0

                            return (
                                <Link
                                    key={filter.key}
                                    href={{
                                        pathname: '/platform/tenants',
                                        query: { ...(q ? { q } : {}), ...(filter.key === 'all' ? {} : { status: filter.key }) },
                                    }}
                                    aria-current={active ? 'true' : undefined}
                                    className={
                                        active
                                            ? 'rounded-[var(--p-r-control)] bg-[var(--p-accent-wash)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--p-accent-wash-ink)]'
                                            : 'rounded-[var(--p-r-control)] px-2.5 py-1.5 text-[12.5px] text-[var(--p-ink-2)] transition-colors hover:bg-[var(--p-surface-2)]'
                                    }
                                >
                                    {filter.label}
                                    <span className="p-num ml-1.5 text-[11px] opacity-60">{count}</span>
                                </Link>
                            )
                        })}
                    </div>

                    <form method="get" className="flex items-center gap-2">
                        {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
                        <div className="relative">
                            <IconSearch
                                size={14}
                                stroke={1.8}
                                aria-hidden="true"
                                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--p-ink-3)]"
                            />
                            <input
                                type="search"
                                name="q"
                                defaultValue={q}
                                placeholder="Name, email, subdomain"
                                aria-label="Search tenants"
                                className="p-input h-9 w-full pl-8 sm:w-[230px]"
                            />
                        </div>
                        <Button type="submit" size="sm" tone="secondary">
                            Search
                        </Button>
                    </form>
                </div>

                {tenants.length === 0 ? (
                    <EmptyState
                        title={query || status !== 'all' ? 'No tenants match' : 'No tenants yet'}
                        description={
                            query || status !== 'all'
                                ? 'Try a different search term, or clear the status filter to see every gym.'
                                : 'Gyms appear here as soon as they sign up. Each row shows plan, member count, and lifecycle state.'
                        }
                        action={
                            query || status !== 'all' ? (
                                <Link href="/platform/tenants">
                                    <Button size="sm" tone="secondary">
                                        Clear filters
                                    </Button>
                                </Link>
                            ) : null
                        }
                    />
                ) : (
                    <TableShell>
                        <thead>
                            <tr>
                                <Th>Tenant</Th>
                                <Th>Status</Th>
                                <Th>Onboarding</Th>
                                <Th>Plan</Th>
                                <Th align="right">Members</Th>
                                <Th align="right">Staff</Th>
                                <Th align="right">MRR</Th>
                                <Th align="right">Joined</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map((tenant) => {
                                const status = tenantStatusTone(tenant.platform_status)
                                const onboarding = tenantStatusTone(tenant.onboarding_status)
                                const trialLeft = daysUntil(
                                    tenant.trial_ends_at ?? tenant.subscription?.trial_ends_at,
                                )

                                return (
                                    <tr key={tenant.id} className="p-row">
                                        <Td>
                                            <Link
                                                href={`/platform/tenants/${tenant.id}`}
                                                className="font-medium text-[var(--p-ink)] hover:text-[var(--p-accent-wash-ink)]"
                                            >
                                                {tenant.name}
                                            </Link>
                                            <span className="mt-0.5 block truncate text-[11.5px] text-[var(--p-ink-3)]">
                                                {tenant.subdomain
                                                    ? `${tenant.subdomain}.gmscloud.app`
                                                    : 'No subdomain claimed'}
                                            </span>
                                        </Td>
                                        <Td>
                                            <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                            {tenant.platform_status === 'trialing' && trialLeft !== null ? (
                                                <span className="p-num mt-1 block text-[11px] text-[var(--p-ink-3)]">
                                                    {trialLeft < 0 ? `${Math.abs(trialLeft)}d over` : `${trialLeft}d left`}
                                                </span>
                                            ) : null}
                                        </Td>
                                        <Td>
                                            <StatusPill tone={onboarding.tone}>{onboarding.label}</StatusPill>
                                        </Td>
                                        <Td>{tenant.subscription?.plan?.name ?? '—'}</Td>
                                        <Td align="right" numeric>
                                            {tenant.memberCount}
                                        </Td>
                                        <Td align="right" numeric>
                                            {tenant.staffCount}
                                        </Td>
                                        <Td align="right" numeric>
                                            {tenant.subscription?.status === 'active'
                                                ? formatCurrency(tenant.mrr)
                                                : '—'}
                                        </Td>
                                        <Td align="right" numeric className="whitespace-nowrap">
                                            {formatDate(tenant.created_at)}
                                        </Td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </TableShell>
                )}
            </Panel>
        </div>
    )
}

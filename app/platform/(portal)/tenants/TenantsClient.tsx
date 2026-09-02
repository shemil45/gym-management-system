'use client'

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconChevronRight, IconLoader2, IconSearch, IconX } from '@tabler/icons-react'
import {
    Button,
    EmptyState,
    MetricTile,
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
import { PLATFORM_STATUS_ORDER, daysUntil } from '@/lib/platform/types'
import type { TenantSummary } from '@/lib/platform/types'

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'trialing', label: 'Trial' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'cancelled', label: 'Cancelled' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

function isFilterKey(value: string): value is FilterKey {
    return FILTERS.some((filter) => filter.key === value)
}

/** Two letters off the first two words, so "Iron Temple Gym" reads IT. */
function monogram(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return '—'
    if (words.length === 1) return words[0].slice(0, 2)
    return words[0][0] + words[1][0]
}

/** The trial countdown, or null when this tenant has no trial to count. */
function trialNote(tenant: TenantSummary): string | null {
    if (tenant.platform_status !== 'trialing') return null
    const left = daysUntil(tenant.trial_ends_at ?? tenant.subscription?.trial_ends_at)
    if (left === null) return null
    return left < 0 ? `${Math.abs(left)}d over` : `${left}d left`
}

export default function TenantsDirectory({
    tenants,
    initialStatus,
    initialQuery,
}: {
    tenants: TenantSummary[]
    initialStatus: string
    initialQuery: string
}) {
    const [status, setStatus] = useState<FilterKey>(
        isFilterKey(initialStatus) ? initialStatus : 'all',
    )
    const [query, setQuery] = useState(initialQuery)
    const router = useRouter()

    // Typing stays responsive on a large directory: the input updates on every
    // keystroke, the list is allowed to lag a frame behind it.
    const deferredQuery = useDeferredValue(query)

    /*
      Filtering happens here rather than on the server.

      Every tenant is already in memory, and the previous version made each
      filter click a navigation to a force-dynamic route — which re-ran the
      whole tenant aggregate query and repainted the page before the tab
      could visibly change. Doing it locally makes the switch immediate.
      The URL is still kept in step below, so a filtered view remains
      shareable and survives a refresh.
    */
    const indexed = useMemo(
        () =>
            tenants.map((tenant) => ({
                tenant,
                haystack: [
                    tenant.name,
                    tenant.business_name,
                    tenant.contact_email,
                    tenant.subdomain,
                    tenant.city,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase(),
            })),
        [tenants],
    )

    const counts = useMemo(() => {
        const map = new Map<string, number>()
        for (const tenant of tenants) {
            map.set(tenant.platform_status, (map.get(tenant.platform_status) ?? 0) + 1)
        }
        return map
    }, [tenants])

    const summary = useMemo(
        () => ({
            active: counts.get('active') ?? 0,
            trialing: counts.get('trialing') ?? 0,
            suspended: counts.get('suspended') ?? 0,
            mrr: tenants.reduce(
                (total, tenant) =>
                    total + (tenant.subscription?.status === 'active' ? tenant.mrr : 0),
                0,
            ),
        }),
        [tenants, counts],
    )

    const visible = useMemo(() => {
        const needle = deferredQuery.trim().toLowerCase()

        return indexed
            .filter(({ tenant }) => status === 'all' || tenant.platform_status === status)
            .filter(({ haystack }) => !needle || haystack.includes(needle))
            .map(({ tenant }) => tenant)
            // Most urgent lifecycle state first, then largest, so a suspended
            // tenant never hides at the bottom of a long directory.
            .sort((a, b) => {
                const rank =
                    PLATFORM_STATUS_ORDER.indexOf(a.platform_status) -
                    PLATFORM_STATUS_ORDER.indexOf(b.platform_status)
                return rank !== 0 ? rank : b.memberCount - a.memberCount
            })
    }, [indexed, status, deferredQuery])

    /*
      Keep the address bar in step without navigating.

      replaceState rather than router.replace on purpose: the router would
      re-run this route on the server for every keystroke and reintroduce
      exactly the delay this component exists to remove. Nothing here reads
      the URL back after mount, so a silent history entry is enough.
    */
    useEffect(() => {
        const params = new URLSearchParams()
        if (deferredQuery.trim()) params.set('q', deferredQuery.trim())
        if (status !== 'all') params.set('status', status)

        const search = params.toString()
        window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname)
    }, [status, deferredQuery])

    const filtered = status !== 'all' || query.trim().length > 0

    const clearFilters = () => {
        setStatus('all')
        setQuery('')
    }

    /*
      Acknowledge a click before the destination has rendered.

      The tenant detail route reads several tables, so a bare router.push left
      the directory looking inert for as long as that took and invited a second
      click on the same row. The transition gives us the exact window between
      click and commit; `pendingId` says which row owns it.
    */
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [navigating, startNavigation] = useTransition()

    const openTenant = (event: React.MouseEvent, id: string) => {
        // Modified and non-primary clicks, and clicks that end a text
        // selection, stay the browser's to handle.
        if (event.defaultPrevented || event.button !== 0) return
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        if (!window.getSelection()?.isCollapsed) return

        event.preventDefault()
        if (pendingId) return
        setPendingId(id)
        startNavigation(() => router.push(`/platform/tenants/${id}`))
    }

    const isOpening = (id: string) => navigating && pendingId === id

    return (
        <div className="flex flex-col gap-6">
            {/* No subtitle: the tiles directly below already give the count
                and the mix, and the sort order is legible from the table. */}
            <PageHeader title="Tenants" />

            <div className="p-panel overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-[var(--p-line-soft)] sm:grid-cols-3 lg:grid-cols-5">
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Tenants"
                            value={String(tenants.length)}
                            footnote="On the platform"
                        />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile label="Active" value={String(summary.active)} footnote="Billing normally" />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="On trial"
                            value={String(summary.trialing)}
                            tone={summary.trialing > 0 ? 'warn' : undefined}
                            footnote="Not counted in MRR"
                        />
                    </div>
                    <div className="bg-[var(--p-surface)]">
                        <MetricTile
                            label="Suspended"
                            value={String(summary.suspended)}
                            tone={summary.suspended > 0 ? 'danger' : undefined}
                            footnote={summary.suspended > 0 ? 'Needs attention' : 'Nothing suspended'}
                        />
                    </div>
                    <div className="col-span-2 bg-[var(--p-surface)] sm:col-span-1">
                        <MetricTile
                            label="MRR"
                            value={formatCurrencyCompact(summary.mrr)}
                            footnote="Active subscriptions only"
                        />
                    </div>
                </div>
            </div>

            <div className="p-panel overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-[var(--p-line)] p-3 lg:flex-row lg:items-center">
                    {/* Recessed tray, raised selected segment: the control looks
                        like a switch rather than five tinted links. */}
                    <div
                        role="group"
                        aria-label="Filter by status"
                        className="flex flex-wrap items-center gap-1 rounded-[var(--p-r-core)] bg-[var(--p-surface-2)] p-1"
                    >
                        {FILTERS.map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setStatus(filter.key)}
                                aria-pressed={status === filter.key}
                                className="p-seg"
                            >
                                {filter.label}
                                <span className="p-seg-count">
                                    {filter.key === 'all'
                                        ? tenants.length
                                        : counts.get(filter.key) ?? 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Takes whatever width the segments leave, up to a line
                        length where a gym name is still comfortably readable. */}
                    <div className="flex items-center gap-2 lg:ml-auto lg:min-w-[200px] lg:max-w-[360px] lg:flex-1">
                        <div className="relative flex-1">
                            <IconSearch
                                size={14}
                                stroke={1.7}
                                aria-hidden="true"
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--p-ink-3)]"
                            />
                            <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Name, email, subdomain, city"
                                aria-label="Search tenants"
                                className="p-input w-full pl-9 pr-9"
                            />
                            {query ? (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    aria-label="Clear search"
                                    className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[var(--p-ink-3)] transition-colors duration-150 ease-[var(--p-ease)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-ink)]"
                                >
                                    <IconX size={12} stroke={2} />
                                </button>
                            ) : null}
                        </div>
                        {filtered ? (
                            <Button size="sm" tone="ghost" onClick={clearFilters}>
                                Clear
                            </Button>
                        ) : null}
                    </div>
                </div>

                {/* Announced rather than only drawn: with instant filtering the
                    result count is the only confirmation a keystroke did
                    anything, and a screen reader would otherwise miss it. */}
                <p
                    aria-live="polite"
                    className="border-b border-[var(--p-line-soft)] px-4 py-2 text-[11.5px] text-[var(--p-ink-3)]"
                >
                    <span className="p-num text-[var(--p-ink-2)]">{visible.length}</span> of{' '}
                    <span className="p-num text-[var(--p-ink-2)]">{tenants.length}</span>{' '}
                    {tenants.length === 1 ? 'tenant' : 'tenants'}
                </p>

                {visible.length === 0 ? (
                    <EmptyState
                        title={filtered ? 'No tenants match' : 'No tenants yet'}
                        description={
                            filtered
                                ? 'Try a different term, or clear the filters.'
                                : 'Gyms appear here as soon as they sign up.'
                        }
                        action={
                            filtered ? (
                                <Button size="sm" tone="secondary" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                            ) : null
                        }
                    />
                ) : (
                    <>
                        {/* Phone: cards. Eight columns do not survive 380px. */}
                        <ul className="flex flex-col gap-px bg-[var(--p-line-soft)] md:hidden">
                            {visible.map((tenant) => {
                                const tone = tenantStatusTone(tenant.platform_status)
                                const note = trialNote(tenant)

                                return (
                                    <li key={tenant.id}>
                                        <Link
                                            href={`/platform/tenants/${tenant.id}`}
                                            onClick={(event) => openTenant(event, tenant.id)}
                                            data-pending={isOpening(tenant.id) ? 'true' : undefined}
                                            aria-busy={isOpening(tenant.id) || undefined}
                                            className="p-tenant-card"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="p-monogram" aria-hidden="true">
                                                    {monogram(tenant.name)}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13.5px] font-medium text-[var(--p-ink)]">
                                                        {tenant.name}
                                                    </p>
                                                    <p className="truncate text-[11.5px] text-[var(--p-ink-3)]">
                                                        {tenant.subdomain
                                                            ? `${tenant.subdomain}.gmscloud.app`
                                                            : 'No subdomain claimed'}
                                                    </p>
                                                </div>
                                                {isOpening(tenant.id) ? (
                                                    <span className="p-defer-in flex shrink-0 self-center text-[var(--p-accent)]">
                                                        <IconLoader2
                                                            size={15}
                                                            stroke={2}
                                                            aria-hidden="true"
                                                            className="animate-spin"
                                                        />
                                                    </span>
                                                ) : (
                                                    <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
                                                )}
                                            </div>

                                            <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-[var(--p-line-soft)] pt-2.5">
                                                <div>
                                                    <dt className="p-label">Plan</dt>
                                                    <dd className="mt-1 truncate text-[12px] text-[var(--p-ink-2)]">
                                                        {tenant.subscription?.plan?.name ?? '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="p-label">Members</dt>
                                                    <dd className="p-num mt-1 text-[12px] text-[var(--p-ink-2)]">
                                                        {tenant.memberCount}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="p-label">MRR</dt>
                                                    <dd className="p-num mt-1 truncate text-[12px] text-[var(--p-ink-2)]">
                                                        {tenant.subscription?.status === 'active'
                                                            ? formatCurrencyCompact(tenant.mrr)
                                                            : '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="p-label">
                                                        {note ? 'Trial' : 'Joined'}
                                                    </dt>
                                                    <dd className="p-num mt-1 truncate text-[12px] text-[var(--p-ink-2)]">
                                                        {note ?? formatDate(tenant.created_at)}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>

                        <div className="hidden md:block">
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
                                        <Th>
                                            <span className="sr-only">Open</span>
                                        </Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((tenant) => {
                                        const tone = tenantStatusTone(tenant.platform_status)
                                        const onboarding = tenantStatusTone(tenant.onboarding_status)
                                        const note = trialNote(tenant)

                                        // The chevron promises the row goes
                                        // somewhere, so the whole row opens it
                                        // (see openTenant); its slot doubles as
                                        // the spinner's, so acknowledging a
                                        // click shifts nothing.
                                        const opening = isOpening(tenant.id)

                                        return (
                                            <tr
                                                key={tenant.id}
                                                className="p-row cursor-pointer"
                                                data-pending={opening ? 'true' : undefined}
                                                aria-busy={opening || undefined}
                                                onClick={(event) => openTenant(event, tenant.id)}
                                            >
                                                <Td>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="p-monogram" aria-hidden="true">
                                                            {monogram(tenant.name)}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <Link
                                                                href={`/platform/tenants/${tenant.id}`}
                                                                className="block truncate font-medium text-[var(--p-ink)] transition-colors duration-150 ease-[var(--p-ease)] hover:text-[var(--p-accent-wash-ink)]"
                                                            >
                                                                {tenant.name}
                                                            </Link>
                                                            <span className="mt-0.5 block truncate text-[11.5px] text-[var(--p-ink-3)]">
                                                                {tenant.subdomain
                                                                    ? `${tenant.subdomain}.gmscloud.app`
                                                                    : 'No subdomain claimed'}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </Td>
                                                <Td>
                                                    <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
                                                    {note ? (
                                                        <span className="p-num mt-1 block text-[11px] text-[var(--p-ink-3)]">
                                                            {note}
                                                        </span>
                                                    ) : null}
                                                </Td>
                                                <Td>
                                                    <StatusPill tone={onboarding.tone}>
                                                        {onboarding.label}
                                                    </StatusPill>
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
                                                <Td className="w-8">
                                                    {opening ? (
                                                        <span className="p-defer-in flex text-[var(--p-accent)]">
                                                            <IconLoader2
                                                                size={15}
                                                                stroke={2}
                                                                aria-hidden="true"
                                                                className="animate-spin"
                                                            />
                                                        </span>
                                                    ) : (
                                                        <IconChevronRight
                                                            size={15}
                                                            stroke={1.7}
                                                            aria-hidden="true"
                                                            className="p-row-go"
                                                        />
                                                    )}
                                                </Td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </TableShell>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

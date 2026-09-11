import Link from 'next/link'
import { getAuditLog } from '@/lib/platform/data'
import {
    EmptyState,
    Panel,
    PageHeader,
    Pager,
    StatusPill,
    TableShell,
    Td,
    Th,
    formatRelative,
} from '@/components/platform/ui'
import AuditFilters from './AuditFilters'
import { auditSearch, type AuditFilterValues } from './filters'

export const metadata = { title: 'Audit log' }
export const dynamic = 'force-dynamic'

/** Groups an action string into a tone so the log is scannable by severity. */
function actionTone(action: string) {
    if (action.includes('suspend') || action.includes('cancel')) return 'danger' as const
    if (action.includes('impersonation')) return 'warn' as const
    if (action.includes('sign_in') || action.includes('sign_out')) return 'idle' as const
    return 'accent' as const
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

export default async function AuditPage({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string
        action?: string
        tenant?: string
        from?: string
        to?: string
        page?: string
    }>
}) {
    const params = await searchParams

    // Only the obviously malformed is dropped here. An unknown action or
    // tenant id simply matches nothing, and the query clamps the page.
    const values: AuditFilterValues = {
        q: params.q?.trim() ?? '',
        action: params.action ?? '',
        tenant: params.tenant ?? '',
        from: params.from && DAY.test(params.from) ? params.from : '',
        to: params.to && DAY.test(params.to) ? params.to : '',
    }
    const requestedPage = Number.parseInt(params.page ?? '1', 10)

    const { entries, total, page, pageSize, pageCount, actions, gyms } = await getAuditLog({
        q: values.q,
        action: values.action || undefined,
        gymId: values.tenant || undefined,
        from: values.from || undefined,
        to: values.to || undefined,
        page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    })

    const filtered = Boolean(values.q || values.action || values.tenant || values.from || values.to)
    const firstOnPage = (page - 1) * pageSize

    return (
        <div className="p-rise flex flex-col gap-5">
            <PageHeader
                title="Audit log"
                description="Every state change made from this console, newest first. Entries are written by the action itself and cannot be edited here."
            />

            <Panel padded={false}>
                <AuditFilters values={values} actions={actions} gyms={gyms} />

                {/* The range, not just the count: on page 4 "50 of 312" cannot
                    tell you where in the log you are standing. */}
                <p
                    aria-live="polite"
                    className="border-b border-[var(--p-line-soft)] px-4 py-2 text-[11.5px] text-[var(--p-ink-3)]"
                >
                    {total === 0 ? (
                        <>
                            <span className="p-num text-[var(--p-ink-2)]">0</span>
                            {filtered ? ' matching entries' : ' entries'}
                        </>
                    ) : (
                        <>
                            <span className="p-num text-[var(--p-ink-2)]">
                                {firstOnPage + 1}-{firstOnPage + entries.length}
                            </span>{' '}
                            of <span className="p-num text-[var(--p-ink-2)]">{total}</span>
                            {filtered ? ' matching' : null} {total === 1 ? 'entry' : 'entries'}
                        </>
                    )}
                </p>

                {entries.length === 0 ? (
                    <EmptyState
                        title={filtered ? 'No entries match' : 'No entries yet'}
                        description={
                            filtered
                                ? 'Try a different term, widen the dates, or clear the filters.'
                                : 'Sign-ins, tenant status changes, billing edits, flag toggles, and support sessions all append here as they happen.'
                        }
                    />
                ) : (
                    <>
                        <TableShell minWidth={680}>
                            <thead>
                                <tr>
                                    <Th>Action</Th>
                                    <Th>Tenant</Th>
                                    <Th>Entity</Th>
                                    <Th>Context</Th>
                                    <Th align="right">When</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => {
                                    const impersonated = entry.metadata?.is_impersonation === true
                                    const reason =
                                        typeof entry.metadata?.reason === 'string' ? entry.metadata.reason : null

                                    return (
                                        <tr key={entry.id} className="p-row">
                                            <Td>
                                                <StatusPill tone={actionTone(entry.action)}>
                                                    {entry.action}
                                                </StatusPill>
                                            </Td>
                                            <Td>
                                                {entry.gym_id && entry.gymName ? (
                                                    <Link
                                                        href={`/platform/tenants/${entry.gym_id}`}
                                                        className="text-[var(--p-ink)] hover:text-[var(--p-accent-wash-ink)]"
                                                    >
                                                        {entry.gymName}
                                                    </Link>
                                                ) : (
                                                    <span className="text-[var(--p-ink-3)]">—</span>
                                                )}
                                            </Td>
                                            <Td numeric className="text-[11.5px]">
                                                {entry.entity_type}
                                            </Td>
                                            <Td>
                                                <span className="block max-w-[38ch] truncate text-[12px] text-[var(--p-ink-3)]">
                                                    {reason ?? '—'}
                                                </span>
                                                {impersonated ? (
                                                    <span className="mt-1 inline-block text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--p-warn-ink)]">
                                                        via support session
                                                    </span>
                                                ) : null}
                                            </Td>
                                            <Td align="right" numeric className="whitespace-nowrap">
                                                {formatRelative(entry.created_at)}
                                            </Td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </TableShell>

                        <Pager
                            page={page}
                            pageCount={pageCount}
                            label="Audit log pages"
                            href={(target) => `/platform/audit${auditSearch(values, target)}`}
                        />
                    </>
                )}
            </Panel>
        </div>
    )
}

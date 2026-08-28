import Link from 'next/link'
import { getAuditLog } from '@/lib/platform/data'
import {
    EmptyState,
    Panel,
    PageHeader,
    StatusPill,
    TableShell,
    Td,
    Th,
    formatRelative,
} from '@/components/platform/ui'

export const metadata = { title: 'Audit log' }
export const dynamic = 'force-dynamic'

/** Groups an action string into a tone so the log is scannable by severity. */
function actionTone(action: string) {
    if (action.includes('suspend') || action.includes('cancel')) return 'danger' as const
    if (action.includes('impersonation')) return 'warn' as const
    if (action.includes('sign_in') || action.includes('sign_out')) return 'idle' as const
    return 'accent' as const
}

export default async function AuditPage() {
    const entries = await getAuditLog(150)

    return (
        <div className="p-rise flex flex-col gap-5">
            <PageHeader
                title="Audit log"
                description="Every state change made from this console, newest first. Entries are written by the action itself and cannot be edited here."
            />

            <Panel padded={false}>
                {entries.length === 0 ? (
                    <EmptyState
                        title="No entries yet"
                        description="Sign-ins, tenant status changes, billing edits, flag toggles, and support sessions all append here as they happen."
                    />
                ) : (
                    <TableShell>
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
                )}
            </Panel>
        </div>
    )
}

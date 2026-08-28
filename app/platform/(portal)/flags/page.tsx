import Link from 'next/link'
import { getFlagMatrix } from '@/lib/platform/data'
import { getPlatformSession, roleCan } from '@/lib/platform/auth'
import { setFeatureOverride, setFlagDefault } from '@/app/platform/actions'
import {
    Button,
    EmptyState,
    Panel,
    PanelHeader,
    PageHeader,
    StatusPill,
    TableShell,
    Td,
    Th,
} from '@/components/platform/ui'

export const metadata = { title: 'Feature flags' }
export const dynamic = 'force-dynamic'

export default async function FlagsPage() {
    const [{ flags, tenants, overrides }, session] = await Promise.all([
        getFlagMatrix(),
        getPlatformSession(),
    ])

    const canWrite = session.admin ? roleCan(session.admin.role, 'flags:write') : false
    const liveTenants = tenants.filter((tenant) => tenant.platform_status !== 'cancelled')

    return (
        <div className="p-rise flex flex-col gap-5">
            <PageHeader
                title="Feature flags"
                description="Platform defaults apply to every tenant. An override pins one tenant on or off regardless of the default."
            />

            {flags.length === 0 ? (
                <Panel padded={false}>
                    <EmptyState
                        title="No flags defined"
                        description="Feature flags are created in the database. Once defined they appear here with a platform default and a per-tenant override column."
                    />
                </Panel>
            ) : (
                <>
                    <Panel padded={false}>
                        <div className="p-4 pb-3">
                            <PanelHeader
                                title="Platform defaults"
                                description="Applies to every tenant that has no override."
                            />
                        </div>
                        <TableShell>
                            <thead>
                                <tr>
                                    <Th>Flag</Th>
                                    <Th>Default</Th>
                                    <Th align="right">Overridden on</Th>
                                    {canWrite ? <Th align="right">Change</Th> : null}
                                </tr>
                            </thead>
                            <tbody>
                                {flags.map((flag) => {
                                    const overriddenCount = liveTenants.filter((tenant) =>
                                        overrides.has(`${tenant.id}:${flag.id}`),
                                    ).length

                                    return (
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
                                            <Td>
                                                <StatusPill tone={flag.is_enabled ? 'ok' : 'idle'}>
                                                    {flag.is_enabled ? 'On' : 'Off'}
                                                </StatusPill>
                                            </Td>
                                            <Td align="right" numeric>
                                                {overriddenCount === 0 ? '—' : `${overriddenCount} tenants`}
                                            </Td>
                                            {canWrite ? (
                                                <Td align="right">
                                                    <form action={setFlagDefault}>
                                                        <input type="hidden" name="flagId" value={flag.id} />
                                                        <input
                                                            type="hidden"
                                                            name="enabled"
                                                            value={String(!flag.is_enabled)}
                                                        />
                                                        <Button type="submit" size="sm" tone="secondary">
                                                            Turn {flag.is_enabled ? 'off' : 'on'}
                                                        </Button>
                                                    </form>
                                                </Td>
                                            ) : null}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </TableShell>
                    </Panel>

                    <Panel padded={false}>
                        <div className="p-4 pb-3">
                            <PanelHeader
                                title="Per-tenant matrix"
                                description="Inherit follows the platform default. Forced values survive a default change."
                            />
                        </div>

                        {liveTenants.length === 0 ? (
                            <EmptyState
                                title="No active tenants"
                                description="Once a gym signs up it appears here with a column per feature flag."
                            />
                        ) : (
                            <TableShell>
                                <thead>
                                    <tr>
                                        <Th className="sticky left-0 z-10">Tenant</Th>
                                        {flags.map((flag) => (
                                            <Th key={flag.id}>{flag.key}</Th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {liveTenants.map((tenant) => (
                                        <tr key={tenant.id} className="p-row">
                                            <Td className="sticky left-0 z-10 bg-[var(--p-surface)]">
                                                <Link
                                                    href={`/platform/tenants/${tenant.id}`}
                                                    className="font-medium text-[var(--p-ink)] hover:text-[var(--p-accent-wash-ink)]"
                                                >
                                                    {tenant.name}
                                                </Link>
                                            </Td>

                                            {flags.map((flag) => {
                                                const override = overrides.get(`${tenant.id}:${flag.id}`)
                                                const effective = override ? override.is_enabled : flag.is_enabled
                                                const current = override
                                                    ? override.is_enabled
                                                        ? 'on'
                                                        : 'off'
                                                    : 'inherit'

                                                if (!canWrite) {
                                                    return (
                                                        <Td key={flag.id}>
                                                            <StatusPill tone={effective ? 'ok' : 'idle'}>
                                                                {effective ? 'On' : 'Off'}
                                                            </StatusPill>
                                                        </Td>
                                                    )
                                                }

                                                return (
                                                    <Td key={flag.id}>
                                                        <form
                                                            action={setFeatureOverride}
                                                            className="flex items-center gap-1.5"
                                                        >
                                                            <input type="hidden" name="gymId" value={tenant.id} />
                                                            <input type="hidden" name="flagId" value={flag.id} />
                                                            <label
                                                                className="sr-only"
                                                                htmlFor={`m-${tenant.id}-${flag.id}`}
                                                            >
                                                                {flag.key} for {tenant.name}
                                                            </label>
                                                            <select
                                                                id={`m-${tenant.id}-${flag.id}`}
                                                                name="value"
                                                                defaultValue={current}
                                                                className="p-input h-8 w-[96px] text-[12px]"
                                                            >
                                                                <option value="inherit">
                                                                    Inherit ({flag.is_enabled ? 'on' : 'off'})
                                                                </option>
                                                                <option value="on">Force on</option>
                                                                <option value="off">Force off</option>
                                                            </select>
                                                            <Button type="submit" size="sm" tone="ghost">
                                                                Set
                                                            </Button>
                                                        </form>
                                                    </Td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </TableShell>
                        )}
                    </Panel>
                </>
            )}
        </div>
    )
}

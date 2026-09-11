'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { IconLoader2, IconSearch, IconX } from '@tabler/icons-react'
import { Button } from '@/components/platform/ui'
import { auditSearch, type AuditFilterValues } from './filters'

/**
 * Filter bar for the audit log.
 *
 * Unlike the tenants directory this filters on the server: the log is
 * unbounded, so the rows are never all in memory and every change is a
 * navigation back into the route. Selects and dates navigate at once; the
 * search box waits for a pause in typing so a six-letter word is one query,
 * not six. The page number is always dropped on a filter change, because a
 * narrower result set rarely still has the page you were on.
 */
export default function AuditFilters({
    values,
    actions,
    gyms,
}: {
    values: AuditFilterValues
    actions: string[]
    gyms: Array<{ id: string; name: string }>
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [pending, startTransition] = useTransition()

    // The search box is the one control whose value can be ahead of the URL,
    // so it keeps local state; everything else reads straight from props.
    const [query, setQuery] = useState(values.q)
    // Re-seed when the URL changes underneath us (back button, Clear), done
    // during render as React recommends rather than in an effect that would
    // paint the stale value first.
    const [seenQ, setSeenQ] = useState(values.q)
    if (seenQ !== values.q) {
        setSeenQ(values.q)
        setQuery(values.q)
    }

    const navigate = (next: AuditFilterValues) => {
        startTransition(() => router.replace(`${pathname}${auditSearch(next)}`, { scroll: false }))
    }

    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const submitQuery = (next: string, immediately = false) => {
        setQuery(next)
        if (debounce.current) clearTimeout(debounce.current)
        const go = () => {
            if (next.trim() === values.q.trim()) return
            navigate({ ...values, q: next })
        }
        if (immediately) go()
        else debounce.current = setTimeout(go, 300)
    }
    useEffect(() => () => {
        if (debounce.current) clearTimeout(debounce.current)
    }, [])

    const filtered = Boolean(values.q || values.action || values.tenant || values.from || values.to)
    const clear = () => {
        setQuery('')
        navigate({ q: '', action: '', tenant: '', from: '', to: '' })
    }

    return (
        <div
            aria-busy={pending || undefined}
            className="flex flex-col gap-3 border-b border-[var(--p-line)] p-3 lg:flex-row lg:items-center"
        >
            <div className="relative flex-1 lg:max-w-[360px]">
                <IconSearch
                    size={14}
                    stroke={1.7}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--p-ink-3)]"
                />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => submitQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') submitQuery(query, true)
                    }}
                    placeholder="Action, entity, reason"
                    aria-label="Search audit log"
                    data-icon="leading trailing"
                    className="p-input w-full"
                />
                {pending ? (
                    <IconLoader2
                        size={14}
                        stroke={2}
                        aria-hidden="true"
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--p-ink-3)]"
                    />
                ) : query ? (
                    <button
                        type="button"
                        onClick={() => submitQuery('', true)}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[var(--p-ink-3)] transition-colors duration-150 ease-[var(--p-ease)] hover:bg-[var(--p-surface-3)] hover:text-[var(--p-ink)]"
                    >
                        <IconX size={12} stroke={2} />
                    </button>
                ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <select
                    value={values.action}
                    onChange={(event) => navigate({ ...values, action: event.target.value })}
                    aria-label="Filter by action"
                    className="p-input"
                    data-size="sm"
                >
                    <option value="">All actions</option>
                    {actions.map((action) => (
                        <option key={action} value={action}>
                            {action}
                        </option>
                    ))}
                </select>

                <select
                    value={values.tenant}
                    onChange={(event) => navigate({ ...values, tenant: event.target.value })}
                    aria-label="Filter by tenant"
                    className="p-input"
                    data-size="sm"
                >
                    <option value="">All tenants</option>
                    {gyms.map((gym) => (
                        <option key={gym.id} value={gym.id}>
                            {gym.name}
                        </option>
                    ))}
                </select>

                {/* Two dates rather than a range picker: native inputs are
                    keyboard-complete and free, and the log is scanned by day,
                    not by hour. */}
                <label className="flex items-center gap-1.5 text-[11.5px] text-[var(--p-ink-3)]">
                    From
                    <input
                        type="date"
                        value={values.from}
                        max={values.to || undefined}
                        onChange={(event) => navigate({ ...values, from: event.target.value })}
                        aria-label="From date"
                        className="p-input"
                        data-size="sm"
                    />
                </label>
                <label className="flex items-center gap-1.5 text-[11.5px] text-[var(--p-ink-3)]">
                    To
                    <input
                        type="date"
                        value={values.to}
                        min={values.from || undefined}
                        onChange={(event) => navigate({ ...values, to: event.target.value })}
                        aria-label="To date"
                        className="p-input"
                        data-size="sm"
                    />
                </label>

                {filtered ? (
                    <Button size="sm" tone="ghost" onClick={clear}>
                        Clear
                    </Button>
                ) : null}
            </div>
        </div>
    )
}

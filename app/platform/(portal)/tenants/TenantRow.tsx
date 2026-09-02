'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition, type MouseEvent, type ReactNode } from 'react'
import { IconLoader2 } from '@tabler/icons-react'
import { Td } from '@/components/platform/ui'

/**
 * A tenant row that acknowledges the click before the detail page has
 * rendered.
 *
 * The tenant detail route fetches across several tables, so a plain <Link>
 * left the table looking inert for as long as that took and invited a second
 * click on the same row. `useTransition` gives us the exact window between
 * click and commit, which drives a row-level pending state.
 *
 * The name stays a real <Link>: middle-click, cmd-click and "copy link
 * address" must keep working, so the handler only takes over the plain
 * left-click that would otherwise navigate silently.
 */
export default function TenantRow({
    href,
    name,
    subdomain,
    children,
}: {
    href: string
    name: string
    subdomain: string | null
    children: ReactNode
}) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const navigate = (event: MouseEvent) => {
        // Leave modified clicks, non-primary buttons and clicks that landed on
        // some other interactive element to the browser.
        if (event.defaultPrevented || event.button !== 0) return
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        if ((event.target as HTMLElement).closest('a[href]:not([data-tenant-link]), button')) return

        event.preventDefault()
        if (pending) return
        startTransition(() => router.push(href))
    }

    return (
        <tr
            className="p-row cursor-pointer"
            data-pending={pending ? 'true' : undefined}
            aria-busy={pending || undefined}
            onClick={navigate}
        >
            <Td>
                <span className="flex items-center gap-1.5">
                    <Link
                        href={href}
                        data-tenant-link
                        className="font-medium text-[var(--p-ink)] hover:text-[var(--p-accent-wash-ink)]"
                    >
                        {name}
                    </Link>
                    {pending ? (
                        // The reveal delay lives on the wrapper and the spin on
                        // the icon: both are the `animation` shorthand, so one
                        // element cannot carry them together.
                        <span className="p-defer-in flex shrink-0 text-[var(--p-accent)]">
                            <IconLoader2 size={13} stroke={2} aria-hidden="true" className="animate-spin" />
                        </span>
                    ) : null}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-[var(--p-ink-3)]">
                    {subdomain ? `${subdomain}.gmscloud.app` : 'No subdomain claimed'}
                </span>
            </Td>
            {children}
        </tr>
    )
}

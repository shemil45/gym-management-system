'use client'

import Link from 'next/link'
import { IconLogout, IconMenu2, IconShieldLock } from '@tabler/icons-react'
import { ThemeToggle } from '@/components/platform/PlatformTheme'
import PlatformNotifications, {
    type PlatformNotificationItem,
} from '@/components/platform/PlatformNotifications'
import { Button } from '@/components/platform/ui'

/**
 * Global header for the Platform Portal.
 *
 * Structurally this is the admin portal's header — identity on the left,
 * theme / notifications / account / sign-out on the right, one hairline
 * underneath — rendered in the platform's own token set rather than the
 * admin's hard-coded hex, so the two portals read as one product without
 * either theme leaking into the other.
 *
 * It also owns the mobile navigation trigger, so the rail no longer needs a
 * second bar of its own above the content.
 */
export default function PlatformTopbar({
    admin,
    notifications,
    signOut,
    onMenuClick,
}: {
    admin: { name: string; email: string | null; role: string }
    notifications: PlatformNotificationItem[]
    signOut: () => Promise<void>
    onMenuClick: () => void
}) {
    const initials =
        admin.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('') || 'PO'

    return (
        <header className="sticky top-0 z-30 border-b border-[var(--p-line)] bg-[var(--p-surface)]">
            <div className="flex h-[var(--p-topbar)] items-center gap-2 px-4 sm:gap-3 lg:px-8">
                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Open navigation"
                    className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--p-r-control)] text-[var(--p-ink-2)] transition-colors duration-[0.16s] [transition-timing-function:var(--p-ease)] hover:bg-[var(--p-surface-2)] hover:text-[var(--p-ink)] lg:hidden"
                >
                    <IconMenu2 size={18} stroke={1.7} aria-hidden="true" />
                </button>

                <Link
                    href="/platform"
                    aria-label="Platform overview"
                    className="flex min-w-0 items-center gap-2.5"
                >
                    <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--p-ink)] text-[var(--p-bg)] sm:flex lg:hidden">
                        <IconShieldLock size={15} stroke={1.7} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 items-center gap-2.5">
                        <span className="truncate text-[16px] font-semibold leading-tight tracking-[-0.015em] text-[var(--p-ink)]">
                            GMS Cloud
                        </span>
                        <span className="p-label hidden shrink-0 border-l border-[var(--p-line)] pl-2.5 sm:inline-block">
                            Platform console
                        </span>
                    </span>
                </Link>

                <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <div className="hidden sm:block">
                        <ThemeToggle />
                    </div>

                    <PlatformNotifications items={notifications} />

                    {/* Account. The name is the first thing to go when width is
                        tight; the initials keep the "who am I signed in as"
                        anchor that an impersonating operator needs. */}
                    <div className="flex items-center gap-2 pl-0.5 sm:border-l sm:border-[var(--p-line)] sm:pl-2.5">
                        <span
                            aria-hidden="true"
                            className="p-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--p-surface-3)] text-[10.5px] font-semibold text-[var(--p-ink-2)]"
                        >
                            {initials}
                        </span>
                        <span className="hidden min-w-0 md:block">
                            <span className="block max-w-[150px] truncate text-[12.5px] font-medium leading-tight text-[var(--p-ink)]">
                                {admin.name}
                            </span>
                            <span className="block max-w-[150px] truncate text-[11.5px] leading-tight text-[var(--p-ink-3)]">
                                {admin.role}
                            </span>
                        </span>
                    </div>

                    <form action={signOut}>
                        <Button
                            tone="secondary"
                            size="sm"
                            type="submit"
                            aria-label="Sign out"
                            className="max-sm:w-8 max-sm:px-0"
                        >
                            <IconLogout size={14} stroke={1.8} aria-hidden="true" />
                            <span className="max-sm:sr-only">Sign out</span>
                        </Button>
                    </form>
                </div>
            </div>
        </header>
    )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    IconBell,
    IconCreditCard,
    IconHome,
    IconQrcode,
    IconStretching,
    IconUser,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'

/*
  Portal chrome.

  Mobile: a fixed bottom bar with four destinations and one raised primary
  action (Pass) in the thumb-sweet-spot at the centre. Everything a member
  reaches for one-handed lives in the bottom third of the screen.

  Desktop (lg+): the same five items become a left rail. The hierarchy does not
  change, it only unfolds sideways: Pass stays the single emphasised action.
*/

interface Destination {
    href: string
    label: string
    icon: typeof IconHome
    /** Home would otherwise match every nested member route. */
    exact?: boolean
}

const DESTINATIONS: Destination[] = [
    { href: '/member', label: 'Home', icon: IconHome, exact: true },
    { href: '/member/train', label: 'Train', icon: IconStretching },
    { href: '/member/membership', label: 'Plan', icon: IconCreditCard },
    { href: '/member/account', label: 'Account', icon: IconUser },
]

function useIsActive() {
    const pathname = usePathname() ?? '/member'
    return (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

/* ------------------------------------------------------------------ top */

const TITLES: Record<string, string> = {
    '/member': 'Home',
    '/member/train': 'Training',
    '/member/pass': 'Gym pass',
    '/member/membership': 'Membership',
    '/member/membership/renew': 'Renew plan',
    '/member/account': 'Account',
    '/member/activity': 'Activity',
    '/member/payments': 'Payments',
    '/member/notifications': 'Notifications',
    '/member/profile': 'Profile',
    '/member/referrals': 'Refer a friend',
    '/member/support': 'Help',
}

export function TopBar({
    homeTitle,
    gymName,
    unread,
}: {
    homeTitle: string
    gymName: string
    unread: number
}) {
    const pathname = usePathname() ?? '/member'
    const title = pathname === '/member' ? homeTitle : (TITLES[pathname] ?? 'Member portal')

    return (
        <header
            className="sticky top-0 z-30 border-b border-[var(--m-line-soft)] bg-[var(--m-bg)]/85 backdrop-blur-xl lg:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="flex h-[var(--m-topbar)] items-center gap-3 px-5">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.015em]">
                        {title}
                    </p>
                    <p className="truncate text-[11.5px] leading-tight text-[var(--m-ink-3)]">
                        {gymName}
                    </p>
                </div>
                <Link
                    href="/member/notifications"
                    aria-label={
                        unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
                    }
                    className="m-tap relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--m-line)] bg-[var(--m-surface)]"
                >
                    <IconBell size={19} stroke={1.7} />
                    {unread > 0 ? (
                        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--m-accent-strong)] ring-2 ring-[var(--m-surface)]" />
                    ) : null}
                </Link>
            </div>
        </header>
    )
}

/* --------------------------------------------------------------- bottom */

export function BottomNav() {
    const isActive = useIsActive()
    const passActive = isActive('/member/pass')

    return (
        <nav
            aria-label="Primary, mobile"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--m-line)] bg-[var(--m-bg)]/90 backdrop-blur-xl lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="relative mx-auto grid h-[var(--m-bottomnav)] max-w-[560px] grid-cols-5 items-center px-1">
                {DESTINATIONS.slice(0, 2).map((item) => (
                    <NavTab key={item.href} item={item} active={isActive(item.href, item.exact)} />
                ))}

                {/* Raised primary action, centred for thumb reach. */}
                <div className="flex items-start justify-center">
                    <Link
                        href="/member/pass"
                        aria-label="Show gym pass"
                        aria-current={passActive ? 'page' : undefined}
                        className={cn(
                            'm-tap -mt-7 flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full border-4 border-[var(--m-bg)] shadow-[0_10px_24px_-8px_oklch(0.19_0.006_95_/_0.45)]',
                            passActive
                                ? 'bg-[var(--m-ink)] text-[var(--m-bg)]'
                                : 'bg-[var(--m-accent)] text-[var(--m-accent-ink)]',
                        )}
                    >
                        <IconQrcode size={24} stroke={1.8} />
                    </Link>
                </div>

                {DESTINATIONS.slice(2).map((item) => (
                    <NavTab key={item.href} item={item} active={isActive(item.href, item.exact)} />
                ))}
            </div>
        </nav>
    )
}

function NavTab({
    item,
    active,
}: {
    item: Destination
    active: boolean
}) {
    const Icon = item.icon
    return (
        <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'm-tap flex h-[54px] flex-col items-center justify-center gap-1 rounded-[16px]',
                active ? 'text-[var(--m-ink)]' : 'text-[var(--m-ink-3)]',
            )}
        >
            <Icon size={22} stroke={active ? 2.1 : 1.6} />
            <span className={cn('text-[10.5px]', active ? 'font-semibold' : 'font-medium')}>
                {item.label}
            </span>
        </Link>
    )
}

/* -------------------------------------------------------------- desktop */

export function DesktopRail({
    gymName,
    memberName,
    memberCode,
    unread,
}: {
    gymName: string
    memberName: string
    memberCode: string
    unread: number
}) {
    const isActive = useIsActive()

    return (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[var(--m-line)] bg-[var(--m-surface)] px-4 py-6 lg:flex">
            <div className="px-2">
                <p className="text-[15px] font-semibold tracking-[-0.015em]">{gymName}</p>
                <p className="mt-0.5 text-[12px] text-[var(--m-ink-3)]">Member portal</p>
            </div>

            <Link
                href="/member/pass"
                className="m-tap mt-6 flex h-12 items-center gap-2.5 rounded-full bg-[var(--m-accent)] px-4 text-[14px] font-semibold text-[var(--m-accent-ink)]"
            >
                <IconQrcode size={20} stroke={1.9} />
                Show my pass
            </Link>

            <nav aria-label="Primary, desktop" className="mt-6 flex flex-col gap-1">
                {DESTINATIONS.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href, item.exact)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'm-tap flex h-11 items-center gap-3 rounded-[var(--m-r-control)] px-3 text-[14px]',
                                active
                                    ? 'bg-[var(--m-surface-2)] font-semibold text-[var(--m-ink)]'
                                    : 'font-medium text-[var(--m-ink-2)]',
                            )}
                        >
                            <Icon size={20} stroke={active ? 2 : 1.6} />
                            {item.label}
                        </Link>
                    )
                })}
                <Link
                    href="/member/notifications"
                    className={cn(
                        'm-tap flex h-11 items-center gap-3 rounded-[var(--m-r-control)] px-3 text-[14px]',
                        isActive('/member/notifications')
                            ? 'bg-[var(--m-surface-2)] font-semibold text-[var(--m-ink)]'
                            : 'font-medium text-[var(--m-ink-2)]',
                    )}
                >
                    <IconBell size={20} stroke={1.6} />
                    Notifications
                    {unread > 0 ? (
                        <span className="m-num ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--m-accent)] px-1.5 text-[11px] font-semibold text-[var(--m-accent-ink)]">
                            {unread}
                        </span>
                    ) : null}
                </Link>
            </nav>

            <div className="mt-auto flex items-center gap-3 rounded-[var(--m-r-control)] bg-[var(--m-surface-2)] p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--m-ink)] text-[12px] font-semibold text-[var(--m-bg)]">
                    {memberName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{memberName}</span>
                    <span className="m-num block truncate text-[11.5px] text-[var(--m-ink-3)]">
                        {memberCode}
                    </span>
                </span>
            </div>
        </aside>
    )
}

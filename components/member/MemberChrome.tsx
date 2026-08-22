'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    IconBell,
    IconChevronLeft,
    IconCreditCard,
    IconHome,
    IconReceipt,
    IconStretching,
    IconUser,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { ThemeToggleButton } from '@/components/member/ThemeToggleButton'
import { NotificationButton } from '@/components/member/NotificationButton'

/*
  Portal chrome.

  Five destinations, one set, two shapes.

  Mobile: a fixed bottom bar. Home sits in the centre, raised, because it is
  where a member lands and where they return between tasks. It is a navigation
  destination that has been given weight, not a floating action: it carries its
  own label on the same baseline as its neighbours, and it takes the same
  active and inactive states they do.

  Desktop (lg+): the same five become a left rail in reading order, Home first.
  The hierarchy does not change, it only unfolds sideways.
*/

interface Destination {
    href: string
    label: string
    icon: typeof IconHome
    /** Home would otherwise match every nested member route. */
    exact?: boolean
}

/*
  Desktop rail order. The bottom bar reorders around the raised centre using the
  slices below, so there is only ever one list to keep correct.
*/
const DESTINATIONS: Destination[] = [
    { href: '/member', label: 'Home', icon: IconHome, exact: true },
    { href: '/member/train', label: 'Train', icon: IconStretching },
    { href: '/member/membership', label: 'Plan', icon: IconCreditCard },
    { href: '/member/payments', label: 'Payments', icon: IconReceipt },
    { href: '/member/account', label: 'Account', icon: IconUser },
]

const HOME = DESTINATIONS[0]
const BOTTOM_LEFT = [DESTINATIONS[1], DESTINATIONS[2]]
const BOTTOM_RIGHT = [DESTINATIONS[3], DESTINATIONS[4]]

function useIsActive() {
    const pathname = usePathname() ?? '/member'
    return (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

/* ------------------------------------------------------------------ top */

/*
  Where "back" goes from a screen that is not a bottom-nav destination. An
  explicit parent beats history.back(), which lands somewhere arbitrary when the
  member arrived from a notification deep link or a shared URL.

  Payments is a destination now, so it has no parent: it is reached from the bar
  rather than from inside membership.
*/
const PARENTS: Record<string, string> = {
    '/member/activity': '/member',
    '/member/notifications': '/member',
    '/member/membership/renew': '/member/membership',
    '/member/payments/result': '/member/payments',
    '/member/profile': '/member/account',
    '/member/referrals': '/member/account',
    '/member/support': '/member/account',
}

/**
 * Mobile header. Brand and two utility controls, nothing else.
 *
 * No page title, no member identity, no navigation: the page names itself in
 * content and the bottom bar owns navigation, so this stays one line tall and
 * never competes with either.
 */
export function TopBar({ gymName, unread }: { gymName: string; unread: number }) {
    return (
        <header
            className="sticky top-0 z-30 border-b border-[var(--m-line-soft)] bg-[var(--m-bg)]/85 backdrop-blur-xl lg:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="flex h-[var(--m-topbar)] items-center gap-2 px-5">
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.015em]">
                    {gymName}
                </p>
                <ThemeToggleButton />
                <NotificationButton unread={unread} />
            </div>
        </header>
    )
}

/**
 * Desktop header. Sits above the content column only, so the rail keeps the
 * full height of the viewport and the two align on the same top edge.
 *
 * It is sticky rather than fixed and therefore occupies its own space in the
 * flow, which is what keeps it from overlapping the page beneath it.
 */
export function DesktopHeader({ gymName, unread }: { gymName: string; unread: number }) {
    return (
        <header className="sticky top-0 z-20 hidden border-b border-[var(--m-line-soft)] bg-[var(--m-bg)]/85 backdrop-blur-xl lg:block">
            {/* Same max-width and gutters as the page content below, so the
                brand lines up with the first heading on the page. */}
            <div className="mx-auto flex h-[var(--m-header)] max-w-[1120px] items-center gap-3 px-10">
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.015em]">
                    {gymName}
                </p>
                <ThemeToggleButton />
                <NotificationButton unread={unread} />
            </div>
        </header>
    )
}

/**
 * Back control for screens that are not bottom-nav destinations. It renders
 * inside the page heading rather than in the header, which the design brief
 * keeps free of navigation.
 */
export function BackLink() {
    const pathname = usePathname() ?? '/member'
    const parent = PARENTS[pathname]
    if (!parent) return null

    return (
        <Link
            href={parent}
            aria-label="Back"
            className="m-tap -ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full lg:hidden"
        >
            <IconChevronLeft size={22} stroke={2} />
        </Link>
    )
}

/* --------------------------------------------------------------- bottom */

export function BottomNav() {
    const isActive = useIsActive()

    return (
        <nav
            aria-label="Primary, mobile"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--m-line)] bg-[var(--m-bg)]/90 backdrop-blur-xl lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="mx-auto grid h-[var(--m-bottomnav)] max-w-[560px] grid-cols-5 items-center px-1">
                {BOTTOM_LEFT.map((item) => (
                    <NavTab key={item.href} item={item} active={isActive(item.href, item.exact)} />
                ))}

                <HomeTab active={isActive(HOME.href, HOME.exact)} />

                {BOTTOM_RIGHT.map((item) => (
                    <NavTab key={item.href} item={item} active={isActive(item.href, item.exact)} />
                ))}
            </div>
        </nav>
    )
}

/*
  Both tab shapes bottom-align their contents inside the same 54px box, so all
  five labels share one baseline whatever height the mark above them takes. That
  shared baseline is what stops the raised centre from reading as a button
  dropped on top of a nav bar.
*/
const TAB_BOX = 'm-tap flex h-[54px] flex-col items-center justify-end gap-1 pb-2'

function TabLabel({ children, active }: { children: React.ReactNode; active: boolean }) {
    return (
        <span
            className={cn(
                'text-[10.5px] leading-[13px]',
                active ? 'font-semibold' : 'font-medium',
            )}
        >
            {children}
        </span>
    )
}

function NavTab({ item, active }: { item: Destination; active: boolean }) {
    const Icon = item.icon
    return (
        <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                TAB_BOX,
                'rounded-[16px]',
                active ? 'text-[var(--m-ink)]' : 'text-[var(--m-ink-3)]',
            )}
        >
            <Icon size={22} stroke={active ? 2.1 : 1.6} />
            <TabLabel active={active}>{item.label}</TabLabel>
        </Link>
    )
}

/**
 * Home. The centre destination, lifted clear of the bar so it reads as the
 * anchor of the set rather than as one of five equals.
 *
 * The lift is a consequence of the disc being taller than its box while the
 * column stays bottom-aligned, which is what keeps the label on the shared
 * baseline. The ring is painted in the page background so the disc cuts
 * cleanly through the bar's top hairline instead of sitting on it.
 */
function HomeTab({ active }: { active: boolean }) {
    return (
        <Link
            href={HOME.href}
            aria-current={active ? 'page' : undefined}
            className={cn(TAB_BOX, active ? 'text-[var(--m-ink)]' : 'text-[var(--m-ink-2)]')}
        >
            <span
                className={cn(
                    // shrink-0 matters: the column has a fixed height, so the
                    // disc would otherwise be compressed to fit rather than
                    // overflowing upward, which is the whole point of it.
                    'flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full shadow-[var(--m-shadow)] ring-4 ring-[var(--m-bg)] transition-colors duration-[320ms]',
                    active
                        ? 'bg-[var(--m-accent)] text-[var(--m-accent-ink)]'
                        : 'border border-[var(--m-line)] bg-[var(--m-surface)]',
                )}
                style={{ transitionTimingFunction: 'var(--m-ease)' }}
            >
                <IconHome size={24} stroke={active ? 2.1 : 1.7} />
            </span>
            <TabLabel active={active}>{HOME.label}</TabLabel>
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

            {/* Home leads the rail, so the rail needs no separate primary action
                above it. The extra top margin replaces the one the old action
                carried, keeping the brand block's breathing room intact. */}
            <nav aria-label="Primary, desktop" className="mt-8 flex flex-col gap-1">
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

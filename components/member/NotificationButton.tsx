import Link from 'next/link'
import { IconBell } from '@tabler/icons-react'

/**
 * Header notification control. The badge sits inside the 44px target rather
 * than beside it, so an unread count never widens the header.
 */
export function NotificationButton({ unread }: { unread: number }) {
    const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'

    return (
        <Link
            href="/member/notifications"
            aria-label={label}
            className="m-tap relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-ink)]"
        >
            <IconBell size={19} stroke={1.7} />
            {unread > 0 ? (
                <span
                    aria-hidden="true"
                    className="m-num absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--m-accent)] px-1 text-[10.5px] font-semibold text-[var(--m-accent-ink)] ring-2 ring-[var(--m-bg)]"
                >
                    {unread > 9 ? '9+' : unread}
                </span>
            ) : null}
        </Link>
    )
}

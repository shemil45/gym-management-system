'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { IconBell } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

/**
 * Attention tray for the global header.
 *
 * The items are derived server-side from `deriveTenantAlerts`, the same
 * function the dashboard's alert lane uses, so the badge can never disagree
 * with the page an operator lands on after clicking it.
 */

export type PlatformNotificationItem = {
    key: string
    label: string
    count: number
    href: string
    tone: 'ok' | 'warn' | 'danger' | 'accent' | 'idle'
}

export default function PlatformNotifications({ items }: { items: PlatformNotificationItem[] }) {
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const live = items.filter((item) => item.count > 0)
    const total = live.reduce((sum, item) => sum + item.count, 0)

    // Dismiss on outside click or Escape. Both, because a tray opened by
    // mouse is as often closed by keyboard.
    useEffect(() => {
        if (!open) return

        const onPointerDown = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={
                    total > 0 ? `Notifications, ${total} tenants need attention` : 'Notifications, none pending'
                }
                className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-[var(--p-r-control)] text-[var(--p-ink-2)]',
                    'transition-colors duration-[0.16s] [transition-timing-function:var(--p-ease)]',
                    'hover:bg-[var(--p-surface-2)] hover:text-[var(--p-ink)]',
                    open && 'bg-[var(--p-surface-2)] text-[var(--p-ink)]',
                )}
            >
                <IconBell size={16} stroke={1.7} aria-hidden="true" />
                {total > 0 ? (
                    <span
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 h-[6px] w-[6px] rounded-full bg-[var(--p-warn)] ring-2 ring-[var(--p-surface)]"
                    />
                ) : null}
            </button>

            {open ? (
                <div
                    role="dialog"
                    aria-label="Notifications"
                    className={cn(
                        'z-50 overflow-hidden rounded-[var(--p-r-shell)] border border-[var(--p-line)] bg-[var(--p-surface)] shadow-[var(--p-shadow-lift)]',
                        // Anchored to the bell on tablet up; pinned to the
                        // viewport on phones, where a 280px panel hung off a
                        // near-right-edge trigger would run off screen.
                        'max-sm:fixed max-sm:inset-x-4 max-sm:top-[calc(var(--p-topbar)+8px)]',
                        'sm:absolute sm:right-0 sm:top-[calc(100%+8px)] sm:w-[280px]',
                    )}
                >
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--p-line)] px-3.5 py-2.5">
                        <p className="text-[12.5px] font-semibold text-[var(--p-ink)]">Needs attention</p>
                        <span className="p-num text-[11.5px] text-[var(--p-ink-3)]">{total}</span>
                    </div>

                    {live.length === 0 ? (
                        <p className="px-3.5 py-4 text-[12.5px] leading-[1.5] text-[var(--p-ink-3)]">
                            Nothing needs attention. Every tenant is active and billing cleanly.
                        </p>
                    ) : (
                        <ul className="py-1">
                            {live.map((item) => (
                                <li key={item.key}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center justify-between gap-3 px-3.5 py-2 text-[13px] text-[var(--p-ink-2)] transition-colors duration-[0.14s] [transition-timing-function:var(--p-ease)] hover:bg-[var(--p-surface-2)] hover:text-[var(--p-ink)]"
                                    >
                                        <span className="p-pill" data-tone={item.tone}>
                                            {item.label}
                                        </span>
                                        <span className="p-num text-[12.5px] text-[var(--p-ink-3)]">
                                            {item.count}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    )
}

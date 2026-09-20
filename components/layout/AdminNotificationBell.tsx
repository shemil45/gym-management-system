'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Gift, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import {
    fetchGymNotifications,
    markAllGymNotificationsRead,
    markGymNotificationRead,
    type GymNotificationItem,
} from '@/app/admin/notifications/actions'

const POLL_MS = 60_000

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const minutes = Math.round(diff / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    return `${days}d ago`
}

/**
 * The header bell, backed by `gym_notifications`. Polled once a minute
 * while the tab is visible, which is enough for a front desk; the unread
 * dot the header used to draw unconditionally now means something.
 */
export default function AdminNotificationBell({ className }: { className: string }) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<GymNotificationItem[]>([])
    const [unread, setUnread] = useState(0)
    const [loading, setLoading] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const load = useCallback(async () => {
        try {
            const result = await fetchGymNotifications()
            setItems(result.items)
            setUnread(result.unread)
        } catch {
            /* the bell is informational; a failed poll just keeps the last state */
        }
    }, [])

    useEffect(() => {
        // First fetch is scheduled, not run inline: the effect only wires up
        // the external polling; state changes land in the poll callbacks.
        const initial = setTimeout(() => void load(), 0)
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') void load()
        }, POLL_MS)
        return () => {
            clearTimeout(initial)
            clearInterval(timer)
        }
    }, [load])

    useEffect(() => {
        if (!open) return
        const onPointerDown = (event: PointerEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    async function toggle() {
        const next = !open
        setOpen(next)
        if (next) {
            setLoading(true)
            await load()
            setLoading(false)
        }
    }

    async function openItem(item: GymNotificationItem) {
        setOpen(false)
        if (!item.read_at) {
            setItems((current) => current.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)))
            setUnread((current) => Math.max(0, current - 1))
            void markGymNotificationRead(item.id)
        }
        if (item.href) router.push(item.href)
    }

    async function markAll() {
        setItems((current) => current.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })))
        setUnread(0)
        await markAllGymNotificationsRead()
    }

    const panel = isDark ? 'border-[#2a2a2a] bg-[#161616] text-gray-100' : 'border-gray-200 bg-white text-gray-900'
    const muted = isDark ? 'text-gray-400' : 'text-gray-500'

    return (
        <div ref={wrapperRef} className="relative">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void toggle()}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={open}
                aria-haspopup="dialog"
                className={className}
            >
                <Bell className="h-4 w-4" />
                {unread > 0 ? (
                    <span
                        aria-hidden="true"
                        className={`absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white ring-1 ${
                            isDark ? 'ring-[#171717]' : 'ring-[#f7f9fb]'
                        }`}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                ) : null}
            </Button>

            {open ? (
                <div
                    role="dialog"
                    aria-label="Notifications"
                    className={`absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-lg ${panel}`}
                >
                    <div className={`flex items-center justify-between border-b px-3.5 py-2.5 ${isDark ? 'border-[#2a2a2a]' : 'border-gray-100'}`}>
                        <p className="text-sm font-semibold">Notifications</p>
                        {unread > 0 ? (
                            <button type="button" onClick={() => void markAll()} className={`text-xs ${muted} hover:underline`}>
                                Mark all read
                            </button>
                        ) : null}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {loading && items.length === 0 ? (
                            <div className={`flex items-center justify-center py-8 ${muted}`}>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            </div>
                        ) : items.length === 0 ? (
                            <p className={`px-3.5 py-8 text-center text-sm ${muted}`}>Nothing yet. New referral leads show up here.</p>
                        ) : (
                            <ul className={`divide-y ${isDark ? 'divide-[#2a2a2a]' : 'divide-gray-100'}`}>
                                {items.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => void openItem(item)}
                                            className={`flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors ${
                                                isDark ? 'hover:bg-[#1f1f1f]' : 'hover:bg-gray-50'
                                            } ${item.read_at ? '' : isDark ? 'bg-[#1a1a1a]' : 'bg-amber-50/40'}`}
                                        >
                                            <span
                                                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                                    isDark ? 'bg-[#2a2a2a] text-gray-200' : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-baseline justify-between gap-2">
                                                    <span className={`text-sm ${item.read_at ? 'font-medium' : 'font-semibold'}`}>{item.title}</span>
                                                    <span className={`shrink-0 text-[11px] ${muted}`}>{timeAgo(item.created_at)}</span>
                                                </span>
                                                <span className={`mt-0.5 block text-xs leading-relaxed ${muted}`}>{item.body}</span>
                                            </span>
                                            {!item.read_at ? <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" /> : null}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

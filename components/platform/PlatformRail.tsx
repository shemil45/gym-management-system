'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
    IconAdjustmentsHorizontal,
    IconBuildingStore,
    IconCreditCard,
    IconGauge,
    IconHistory,
    IconMenu2,
    IconShieldLock,
    IconX,
} from '@tabler/icons-react'

const NAV = [
    { href: '/platform', label: 'Overview', Icon: IconGauge, exact: true },
    { href: '/platform/tenants', label: 'Tenants', Icon: IconBuildingStore },
    { href: '/platform/billing', label: 'Billing', Icon: IconCreditCard },
    { href: '/platform/flags', label: 'Feature flags', Icon: IconAdjustmentsHorizontal },
    { href: '/platform/audit', label: 'Audit log', Icon: IconHistory },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()

    return (
        <nav className="flex flex-col gap-0.5" aria-label="Platform sections">
            {NAV.map(({ href, label, Icon, exact }) => {
                const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        data-active={active}
                        aria-current={active ? 'page' : undefined}
                        className="p-nav-item"
                    >
                        <Icon size={16} stroke={1.7} aria-hidden="true" className="shrink-0" />
                        {label}
                    </Link>
                )
            })}
        </nav>
    )
}

function Wordmark() {
    return (
        <Link href="/platform" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--p-ink)] text-[var(--p-bg)]">
                <IconShieldLock size={15} stroke={1.7} aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-[var(--p-ink)]">
                    GMS Cloud
                </span>
                <span className="block text-[11px] leading-tight text-[var(--p-ink-3)]">Platform console</span>
            </span>
        </Link>
    )
}

/**
 * Fixed rail on desktop, sheet on mobile.
 *
 * The rail does not collapse to icons-only: at five destinations the labels
 * cost nothing, and an operator scanning for "Billing" should not have to
 * decode a glyph.
 */
export default function PlatformRail({ footer }: { footer: React.ReactNode }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            {/* Mobile bar */}
            <div className="sticky top-0 z-30 flex h-[var(--p-topbar)] items-center justify-between gap-3 border-b border-[var(--p-line)] bg-[var(--p-surface)] px-4 lg:hidden">
                <Wordmark />
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open navigation"
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--p-r-control)] text-[var(--p-ink-2)] transition-colors hover:bg-[var(--p-surface-2)]"
                >
                    <IconMenu2 size={18} stroke={1.7} />
                </button>
            </div>

            {open ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-black/45"
                    />
                    <div className="absolute inset-y-0 left-0 flex w-[264px] flex-col gap-5 border-r border-[var(--p-line)] bg-[var(--p-surface)] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <Wordmark />
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close navigation"
                                className="flex h-8 w-8 items-center justify-center rounded-[var(--p-r-control)] text-[var(--p-ink-3)] hover:bg-[var(--p-surface-2)]"
                            >
                                <IconX size={16} stroke={1.8} />
                            </button>
                        </div>
                        <NavLinks onNavigate={() => setOpen(false)} />
                        <div className="mt-auto">{footer}</div>
                    </div>
                </div>
            ) : null}

            {/* Desktop rail */}
            <aside className="fixed inset-y-0 left-0 hidden w-[var(--p-rail)] flex-col gap-5 border-r border-[var(--p-line)] bg-[var(--p-surface)] p-4 lg:flex">
                <Wordmark />
                <NavLinks />
                <div className="mt-auto">{footer}</div>
            </aside>
        </>
    )
}

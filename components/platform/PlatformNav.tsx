'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const navigation = [
    { href: '/platform', label: 'Overview' },
    { href: '/platform/gyms', label: 'Gyms' },
    { href: '/platform/billing', label: 'Billing' },
    { href: '/platform/analytics', label: 'Analytics' },
    { href: '/platform/support', label: 'Support' },
    { href: '/platform/announcements', label: 'Announcements' },
    { href: '/platform/feature-flags', label: 'Feature Flags' },
    { href: '/platform/audit', label: 'Audit Trail' },
    { href: '/platform/monitoring', label: 'Settings' },
]

export default function PlatformNav() {
    const pathname = usePathname()

    return (
        <nav className="space-y-1">
            {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/platform' && pathname.startsWith(`${item.href}/`))

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-white text-slate-950 shadow-sm'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        )}
                    >
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}

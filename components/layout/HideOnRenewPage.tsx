'use client'

import { usePathname } from 'next/navigation'

/**
 * The renewal page already is the notice, so the account banner above it
 * would say the same thing twice. Everywhere else the banner stays.
 */
export default function HideOnRenewPage({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    if (pathname === '/admin/renew') return null
    return <>{children}</>
}

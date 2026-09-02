'use client'

import { useState } from 'react'
import PlatformRail from '@/components/platform/PlatformRail'
import PlatformTopbar from '@/components/platform/PlatformTopbar'
import type { PlatformNotificationItem } from '@/components/platform/PlatformNotifications'

/**
 * Owns the one piece of state the rail and the header share: whether the
 * mobile navigation sheet is open. Keeping it here means neither component
 * has to know about the other, and the server layout stays a server
 * component.
 */
export default function PlatformChrome({
    admin,
    notifications,
    signOut,
    railFooter,
}: {
    admin: { name: string; email: string | null; role: string }
    notifications: PlatformNotificationItem[]
    signOut: () => Promise<void>
    railFooter: React.ReactNode
}) {
    const [navOpen, setNavOpen] = useState(false)

    return (
        <>
            <PlatformRail footer={railFooter} open={navOpen} onClose={() => setNavOpen(false)} />
            <PlatformTopbar
                admin={admin}
                notifications={notifications}
                signOut={signOut}
                onMenuClick={() => setNavOpen(true)}
            />
        </>
    )
}

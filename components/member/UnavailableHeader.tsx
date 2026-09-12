'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconLoader2, IconLogout } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggleButton } from '@/components/member/ThemeToggleButton'

/**
 * Header for the "portal unavailable" screen. Same brand + theme toggle as
 * the portal's own header, but the notifications control is swapped for
 * logout - there is nothing else on this page to navigate to.
 */
export function UnavailableHeader({ gymName }: { gymName: string }) {
    const router = useRouter()
    const [signingOut, setSigningOut] = useState(false)

    async function signOut() {
        setSigningOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/member/login')
        router.refresh()
    }

    return (
        <header
            className="sticky top-0 z-30 border-b border-[var(--m-line-soft)] bg-[var(--m-bg)]/85 backdrop-blur-xl"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="mx-auto flex h-[var(--m-topbar)] max-w-[1120px] items-center gap-2 px-5 lg:h-[var(--m-header)] lg:gap-3 lg:px-10">
                <p className="min-w-0 flex-1 truncate text-xl font-semibold tracking-[-0.02em] lg:text-2xl">
                    {gymName}
                </p>
                <ThemeToggleButton />
                <button
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                    aria-label="Log out"
                    className="m-tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-ink)] disabled:opacity-60"
                >
                    {signingOut ? (
                        <IconLoader2 size={19} stroke={1.7} className="animate-spin" />
                    ) : (
                        <IconLogout size={19} stroke={1.7} />
                    )}
                </button>
            </div>
        </header>
    )
}

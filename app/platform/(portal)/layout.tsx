import Link from 'next/link'
import { IconExternalLink, IconLogout } from '@tabler/icons-react'
import { requirePlatformSession } from '@/lib/platform/auth'
import { formatPlatformRole } from '@/lib/platform/types'
import PlatformRail from '@/components/platform/PlatformRail'
import { ThemeToggle } from '@/components/platform/PlatformTheme'
import { Button } from '@/components/platform/ui'
import { signOutOfPlatform, stopImpersonation } from '@/app/platform/actions'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const session = await requirePlatformSession()

    const railFooter = (
        <div className="flex flex-col gap-3 border-t border-[var(--p-line)] pt-3.5">
            <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-[var(--p-ink)]">
                    {session.admin.full_name}
                </p>
                <p className="truncate text-[11.5px] text-[var(--p-ink-3)]">
                    {formatPlatformRole(session.admin.role)}
                </p>
            </div>

            <div className="flex items-center justify-between gap-2">
                <ThemeToggle />
                <form action={signOutOfPlatform}>
                    <Button tone="ghost" size="sm" type="submit">
                        <IconLogout size={13} stroke={1.8} aria-hidden="true" />
                        Sign out
                    </Button>
                </form>
            </div>
        </div>
    )

    return (
        <div className="min-h-[100dvh]">
            <PlatformRail footer={railFooter} />

            <div className="lg:pl-[var(--p-rail)]">
                {/* An open support session is the single most important thing
                    on screen while it lasts, so it sits above the content and
                    stays sticky rather than scrolling away. */}
                {session.impersonation ? (
                    <div className="sticky top-0 z-20 border-b border-[var(--p-warn)] bg-[var(--p-warn-wash)]">
                        <div className="mx-auto flex max-w-[1400px] flex-col gap-2.5 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                            <p className="text-[12.5px] leading-[1.5] text-[var(--p-warn-ink)]">
                                <strong className="font-semibold">Support session open</strong> on{' '}
                                {session.impersonation.gymName ?? 'a tenant'}. Your writes in the gym
                                workspace are recorded against your platform account.
                            </p>
                            <form action={stopImpersonation} className="shrink-0">
                                <Button tone="secondary" size="sm" type="submit">
                                    End session
                                </Button>
                            </form>
                        </div>
                    </div>
                ) : null}

                <main className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8 lg:py-8">{children}</main>

                <footer className="mx-auto max-w-[1400px] px-5 pb-8 lg:px-8">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--p-line)] pt-4 text-[11.5px] text-[var(--p-ink-3)]">
                        <span>Signed in as {session.admin.email}</span>
                        <Link
                            href="/admin/dashboard"
                            className="inline-flex items-center gap-1.5 hover:text-[var(--p-ink-2)]"
                        >
                            Open gym workspace
                            <IconExternalLink size={12} stroke={1.8} aria-hidden="true" />
                        </Link>
                    </div>
                </footer>
            </div>
        </div>
    )
}

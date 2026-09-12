import Link from 'next/link'
import { IconExternalLink } from '@tabler/icons-react'
import { requirePlatformSession } from '@/lib/platform/auth'
import { getPlatformAlerts } from '@/lib/platform/data'
import { formatPlatformRole } from '@/lib/platform/types'
import PlatformChrome from '@/components/platform/PlatformChrome'
import { ThemeToggle } from '@/components/platform/PlatformTheme'
import SessionCountdown from '@/components/platform/SessionCountdown'
import { ResumeSessionButton, SessionSubmitButton } from '@/components/platform/SupportSessionControls'
import type { PlatformNotificationItem } from '@/components/platform/PlatformNotifications'
import { signOutOfPlatform, stopImpersonation } from '@/app/platform/actions'
import { sweepExpiredImpersonations } from '@/lib/platform/impersonation-ledger'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const session = await requirePlatformSession()

    // Timed-out support sessions are cleaned up here as well as by cron, so
    // the tenant does not see demo rows for up to 15 minutes after a timeout.
    // Never awaited past a short budget and never allowed to fail the page.
    await Promise.race([
        sweepExpiredImpersonations().catch((err) => console.error('[impersonation] lazy sweep failed', err)),
        new Promise((resolve) => setTimeout(resolve, 1500)),
    ])

    const alerts = await getPlatformAlerts()

    // Ordered by how fast each one costs money if ignored, so the tray reads
    // top-down as a work queue rather than as a category list.
    const notifications: PlatformNotificationItem[] = [
        { key: 'pastDue', label: 'Past due', count: alerts.pastDue.length, href: '/platform/billing', tone: 'danger' },
        {
            key: 'suspended',
            label: 'Suspended',
            count: alerts.suspended.length,
            href: '/platform/tenants?status=suspended',
            tone: 'danger',
        },
        {
            key: 'expiringTrials',
            label: 'Trials ending',
            count: alerts.expiringTrials.length,
            href: '/platform/tenants?status=trialing',
            tone: 'warn',
        },
        {
            key: 'incompleteOnboarding',
            label: 'Onboarding open',
            count: alerts.incompleteOnboarding.length,
            href: '/platform/tenants',
            tone: 'accent',
        },
    ]

    // Sheet-only: on desktop the header carries identity and the theme
    // control, and the phone header has no room for a segmented toggle.
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
            <ThemeToggle />
        </div>
    )

    return (
        <div className="min-h-[100dvh]">
            <div className="lg:pl-[var(--p-rail)]">
                <PlatformChrome
                    admin={{
                        name: session.admin.full_name,
                        email: session.admin.email,
                        role: formatPlatformRole(session.admin.role),
                    }}
                    notifications={notifications}
                    signOut={signOutOfPlatform}
                    railFooter={railFooter}
                />

                {/* An open support session is the single most important thing
                    on screen while it lasts, so it sits above the content and
                    stays sticky rather than scrolling away — docked under the
                    header, which is sticky at a higher layer. */}
                {session.impersonation ? (
                    <div className="sticky top-[var(--p-topbar)] z-20 border-b border-[var(--p-warn)] bg-[var(--p-warn-wash)]">
                        <div className="mx-auto flex max-w-[1400px] flex-col gap-2.5 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                            <p className="text-[12.5px] leading-[1.5] text-[var(--p-warn-ink)]">
                                <strong className="font-semibold">Support session open</strong> on{' '}
                                {session.impersonation.gymName ?? 'a tenant'}. Your writes in the gym
                                workspace are recorded against your platform account. Expires in{' '}
                                <SessionCountdown
                                    expiresAt={session.impersonation.expires_at}
                                    className="p-num font-semibold"
                                />
                                .
                            </p>
                            {/* Both ways out of this state: the session is
                                still open in the DB after any navigation
                                back up here, so "Resume" is the missing
                                half of "End". */}
                            <div className="flex shrink-0 items-center gap-2">
                                <ResumeSessionButton tone="primary">Resume</ResumeSessionButton>
                                <form action={stopImpersonation}>
                                    <SessionSubmitButton pendingLabel="Ending">End session</SessionSubmitButton>
                                </form>
                            </div>
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

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { IconShieldLock } from '@tabler/icons-react'
import { getPlatformSession } from '@/lib/platform/auth'
import { ThemeToggle } from '@/components/platform/PlatformTheme'
import PlatformLoginForm from './LoginForm'

export const metadata = {
    title: 'Sign in',
}

/**
 * Platform sign-in.
 *
 * Deliberately not a marketing page. Anyone who reaches this URL already
 * knows what the console is; the screen's only job is to take two fields and
 * say plainly what happens on the other side. The measure-grid ground is the
 * one visual flourish, and it references the instrument panel the console
 * actually is.
 */
export default async function PlatformLoginPage() {
    const session = await getPlatformSession()

    if (session.user && session.admin) {
        redirect('/platform')
    }

    return (
        <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 py-12">
            {/* Measure grid. Pointer-events-none and fixed so it never
                intercepts input or repaints on scroll. */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 opacity-[0.55]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, var(--p-line-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--p-line-soft) 1px, transparent 1px)',
                    backgroundSize: '68px 68px',
                    maskImage: 'radial-gradient(ellipse 80% 60% at 50% 42%, #000 30%, transparent 100%)',
                    WebkitMaskImage:
                        'radial-gradient(ellipse 80% 60% at 50% 42%, #000 30%, transparent 100%)',
                }}
            />

            <div className="absolute right-5 top-5 z-10">
                <ThemeToggle />
            </div>

            <div className="p-rise relative z-10 w-full max-w-[382px]">
                <div className="mb-6 flex flex-col items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--p-ink)] text-[var(--p-bg)]">
                        <IconShieldLock size={18} stroke={1.7} aria-hidden="true" />
                    </span>
                    <div>
                        <h1 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-[var(--p-ink)]">
                            GMS Cloud Platform
                        </h1>
                        <p className="mt-1 text-[13px] leading-[1.55] text-[var(--p-ink-3)]">
                            Operator console for every gym on the network.
                        </p>
                    </div>
                </div>

                <div className="p-panel p-5 shadow-[var(--p-shadow)]">
                    <PlatformLoginForm />
                </div>

                <div className="mt-5 flex flex-col gap-2.5 text-[12px] leading-[1.6] text-[var(--p-ink-3)]">
                    <p>
                        Every action taken in this console is recorded against your account, including
                        support sessions opened into a gym.
                    </p>
                    <p>
                        Running a gym?{' '}
                        <Link
                            href="/admin/login"
                            className="font-medium text-[var(--p-accent-wash-ink)] underline underline-offset-2 hover:text-[var(--p-accent)]"
                        >
                            Sign in to your gym
                        </Link>
                        {'. '}
                        Working out at one?{' '}
                        <Link
                            href="/member/login"
                            className="font-medium text-[var(--p-accent-wash-ink)] underline underline-offset-2 hover:text-[var(--p-accent)]"
                        >
                            Member sign in
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </main>
    )
}

'use client'

import { useCallback } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconLoader2 } from '@tabler/icons-react'
import { remainingLabel, useSessionCountdown } from '@/components/platform/SessionCountdown'

/*
  The "you are inside a tenant as support" strip at the top of the admin
  portal.

  Client-side because the session has a hard end the server cannot push to
  an already-rendered page: RLS stops honouring the impersonation row the
  instant `expires_at` passes, so without this the page would sit there
  looking active while every save quietly failed. The countdown keeps the
  figure honest, the colour change gives warning to finish a form, and the
  refresh at zero re-runs the layout, which sees no gym access and routes
  the operator back to the platform portal.
*/

const URGENT_MS = 5 * 60_000

/* Reads the surrounding form's pending state, so the click shows as taken
   while the session row is closed and the redirect back to the tenant page
   is in flight. Its own component because useFormStatus only sees a form it
   is rendered inside. */
function ExitButton({ urgent }: { urgent: boolean }) {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            aria-busy={pending || undefined}
            className={
                (urgent
                    ? 'rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-red-50 transition hover:bg-red-800 dark:bg-red-300 dark:text-red-950 dark:hover:bg-red-200'
                    : 'rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-950 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100') +
                ' inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60'
            }
        >
            {pending ? (
                <>
                    <IconLoader2 size={14} stroke={2} className="animate-spin" aria-hidden="true" />
                    Exiting
                </>
            ) : (
                'Exit impersonation'
            )}
        </button>
    )
}

export default function ImpersonationBanner({
    gymName,
    expiresAt,
    stopAction,
}: {
    gymName: string
    expiresAt: string
    stopAction: () => Promise<void>
}) {
    const router = useRouter()
    const onExpire = useCallback(() => router.refresh(), [router])
    const msLeft = useSessionCountdown(expiresAt, onExpire)

    const urgent = msLeft <= URGENT_MS
    const expired = msLeft <= 0

    return (
        <div
            className={
                urgent
                    ? 'impersonation-banner-urgent mb-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200'
                    : 'mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
            }
            role={urgent ? 'alert' : undefined}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold">
                        {expired
                            ? 'Support session expired.'
                            : urgent
                              ? 'Support session ending soon.'
                              : 'Platform impersonation mode is active.'}
                    </p>
                    <p className={urgent ? 'text-sm text-red-800/80 dark:text-red-200/70' : 'text-sm text-amber-800/80 dark:text-amber-200/70'}>
                        You are viewing {gymName} with elevated support access. All actions are audited.{' '}
                        {expired ? (
                            'Returning you to the platform portal.'
                        ) : (
                            <>
                                Expires in{' '}
                                <time
                                    dateTime={expiresAt}
                                    className="font-mono font-semibold tabular-nums"
                                    suppressHydrationWarning
                                >
                                    {remainingLabel(msLeft)}
                                </time>
                                .
                            </>
                        )}
                    </p>
                    <p className={urgent ? 'mt-1 text-sm text-red-800/80 dark:text-red-200/70' : 'mt-1 text-sm text-amber-800/80 dark:text-amber-200/70'}>
                        Records you create here are removed when the session ends.
                    </p>
                </div>
                <form action={stopAction}>
                    <ExitButton urgent={urgent} />
                </form>
            </div>
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'

/*
  Live time-remaining for a support session.

  `formatRelative` in ui.tsx only counts backwards ("14m ago"), so handing it
  a future expiry printed "just now". This counts forwards, and re-renders on
  a timer so the figure in the banner is never stale: a session is two hours
  long and an operator can easily sit on one page for most of that.

  Ticks every second under an hour so the last minutes read as a real
  countdown, and once a minute above that so a long session is not
  re-rendering the banner sixty times a minute for a number that only
  changes hourly.
*/

export function remainingLabel(msLeft: number): string {
    if (msLeft <= 0) return 'Expired'

    const totalSeconds = Math.floor(msLeft / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
    if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
    return `${seconds}s`
}

/**
 * Milliseconds until `expiresAt`, kept live. Returns NaN for an unparseable
 * timestamp. `onExpire` fires once, on the tick that crosses zero, so a
 * caller can act (refresh, redirect) the moment access actually ends.
 */
export function useSessionCountdown(expiresAt: string, onExpire?: () => void): number {
    const target = new Date(expiresAt).getTime()

    // The server renders once with its own clock and the client initialises
    // with its own at hydration, so the two can differ by the seconds in
    // between; callers suppress the hydration warning on the text node.
    const [now, setNow] = useState(() => Date.now())
    const msLeft = target - now

    // Part of the deps so the timer is re-armed at the faster rate when the
    // session crosses under an hour, without `now` itself re-arming it on
    // every tick.
    const underAnHour = msLeft < 3_600_000

    useEffect(() => {
        if (Number.isNaN(target) || target - Date.now() <= 0) return

        const id = window.setInterval(() => setNow(Date.now()), underAnHour ? 1_000 : 60_000)
        return () => window.clearInterval(id)
    }, [target, underAnHour])

    const expired = !Number.isNaN(target) && msLeft <= 0
    useEffect(() => {
        if (expired) onExpire?.()
        // Fire on the transition only; a new `onExpire` identity on a later
        // render must not re-fire it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expired])

    return msLeft
}

export default function SessionCountdown({
    expiresAt,
    className,
}: {
    /** ISO timestamp of the session's `expires_at`. */
    expiresAt: string
    className?: string
}) {
    const msLeft = useSessionCountdown(expiresAt)
    if (Number.isNaN(msLeft)) return null

    return (
        <time dateTime={expiresAt} className={className} suppressHydrationWarning>
            {remainingLabel(msLeft)}
        </time>
    )
}

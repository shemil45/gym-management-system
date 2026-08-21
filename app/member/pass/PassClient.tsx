'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { IconCheck, IconCopy, IconSunHigh, IconWifiOff } from '@tabler/icons-react'
import { Card, Pill } from '@/components/member/ui'
import { cn } from '@/lib/utils/cn'

/*
  The gym pass.

  Design intent: this is the screen a member opens with one hand while walking
  through the door, so the QR is the whole screen, everything else is secondary,
  and the payload is built locally from the member code. It stays scannable with
  no connection, which is why the offline notice is a reassurance and not an
  error.
*/

export default function PassClient({
    memberCode,
    memberName,
    gymName,
    planName,
    state,
}: {
    memberCode: string
    memberName: string
    gymName: string
    planName: string | null
    state: 'active' | 'expiring' | 'expired' | 'frozen' | 'inactive'
}) {
    const [copied, setCopied] = useState(false)
    const [online, setOnline] = useState(true)

    useEffect(() => {
        const sync = () => setOnline(navigator.onLine)
        sync()
        window.addEventListener('online', sync)
        window.addEventListener('offline', sync)
        return () => {
            window.removeEventListener('online', sync)
            window.removeEventListener('offline', sync)
        }
    }, [])

    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 2000)
        return () => clearTimeout(timer)
    }, [copied])

    const blocked = state === 'expired' || state === 'frozen' || state === 'inactive'

    async function copyCode() {
        try {
            await navigator.clipboard.writeText(memberCode)
            setCopied(true)
        } catch {
            /* clipboard unavailable: the code is on screen anyway */
        }
    }

    return (
        <div className="mx-auto w-full max-w-[420px] px-5 lg:px-0">
            <Card className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                        <p className="truncate text-[15.5px] font-semibold tracking-[-0.015em]">
                            {memberName}
                        </p>
                        <p className="truncate text-[12px] text-[var(--m-ink-3)]">
                            {planName ?? 'No active plan'} · {gymName}
                        </p>
                    </div>
                    <Pill
                        tone={
                            state === 'active'
                                ? 'accent'
                                : state === 'expiring'
                                  ? 'warn'
                                  : blocked
                                    ? 'danger'
                                    : 'neutral'
                        }
                    >
                        {state === 'active'
                            ? 'Valid'
                            : state === 'expiring'
                              ? 'Expiring'
                              : state === 'frozen'
                                ? 'On hold'
                                : 'Not valid'}
                    </Pill>
                </div>

                {/* The code plate. Always pure white behind the QR regardless of
                    theme, so scanners read it in dark mode too. */}
                <div className="border-y border-[var(--m-line-soft)] bg-[var(--m-surface-2)] px-5 py-6">
                    <div
                        className={cn(
                            'mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
                            blocked && 'opacity-35',
                        )}
                    >
                        <QRCodeSVG
                            value={`GYMPASS:${memberCode}`}
                            level="M"
                            className="h-full w-full"
                            bgColor="#ffffff"
                            fgColor="#111111"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={copyCode}
                        className="m-tap mx-auto mt-5 flex h-11 items-center gap-2 rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] px-4"
                    >
                        <span className="m-num text-[16px] font-semibold tracking-[0.06em]">
                            {memberCode}
                        </span>
                        {copied ? (
                            <IconCheck size={16} stroke={2.2} className="text-[var(--m-accent-strong)]" />
                        ) : (
                            <IconCopy size={16} stroke={1.8} className="text-[var(--m-ink-3)]" />
                        )}
                    </button>
                </div>

                <div className="space-y-2.5 p-4">
                    {blocked ? (
                        <p className="rounded-[var(--m-r-control)] bg-[var(--m-danger-wash)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--m-danger)]">
                            {state === 'frozen'
                                ? 'Your membership is on hold, so this pass will not open the door. The front desk can restart it.'
                                : 'This pass is not valid right now. Renew your plan to check in again.'}
                        </p>
                    ) : (
                        <p className="flex items-center gap-2 text-[12.5px] text-[var(--m-ink-3)]">
                            <IconSunHigh size={15} stroke={1.8} />
                            Turn your screen brightness up before scanning.
                        </p>
                    )}

                    {!online ? (
                        <p className="flex items-center gap-2 text-[12.5px] text-[var(--m-ink-3)]">
                            <IconWifiOff size={15} stroke={1.8} />
                            You are offline. This pass still scans.
                        </p>
                    ) : null}
                </div>
            </Card>
        </div>
    )
}

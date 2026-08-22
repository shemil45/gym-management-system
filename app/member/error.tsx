'use client'

import { useEffect } from 'react'
import { IconCloudOff, IconRefresh } from '@tabler/icons-react'
import { Button, Card, Screen } from '@/components/member/ui'

/**
 * Route-level failure state. On a phone this most often means the request died
 * on a weak connection, so the copy points at that first and the retry is a
 * full-width target rather than a small link.
 */
export default function MemberError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[member portal]', error)
    }, [error])

    return (
        <Screen>
            <Card className="flex flex-col items-center px-6 py-10 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--m-surface-2)] text-[var(--m-ink-3)]">
                    <IconCloudOff size={26} stroke={1.6} />
                </span>
                <p className="text-[16px] font-semibold tracking-[-0.015em]">
                    This did not load
                </p>
                <p className="mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                    Check your connection and try again.
                </p>
                <div className="mt-6 w-full sm:w-auto">
                    <Button
                        tone="primary"
                        full
                        onClick={reset}
                        leadingIcon={<IconRefresh size={16} stroke={2} />}
                    >
                        Try again
                    </Button>
                </div>
            </Card>
        </Screen>
    )
}

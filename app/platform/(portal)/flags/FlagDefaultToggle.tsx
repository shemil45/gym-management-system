'use client'

import { useActionState, useEffect, useState } from 'react'
import { IconCheck, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/platform/ui'
import { setFlagDefault } from '@/app/platform/actions'
import type { ActionState } from '@/app/platform/actions'

const INITIAL: ActionState = { error: null, success: null }

/** How long the "Saved" flash holds before the button returns to rest. */
const FLASH_MS = 2000

/**
 * Flips one flag's platform-wide default.
 *
 * This is the widest-reaching control on the page: it moves every tenant that
 * has no override. Flipping that in silence and leaving the operator to infer
 * the result from a pill elsewhere in the row is the thing worth fixing, so
 * the button reports its own outcome in place.
 *
 * The label is intentionally read from the server on every render rather than
 * tracked locally. Once the action revalidates, `enabled` arrives flipped and
 * the button renames itself, which means the button can never disagree with
 * the Default pill sitting beside it.
 */
export default function FlagDefaultToggle({
    flagId,
    flagKey,
    enabled,
}: {
    flagId: string
    flagKey: string
    enabled: boolean
}) {
    const [state, formAction, pending] = useActionState(setFlagDefault, INITIAL)

    // The flash is derived rather than stored, so nothing sets state while
    // rendering. The timer only records which result has already been shown.
    const [dismissed, setDismissed] = useState<ActionState | null>(null)
    const flashing = Boolean(state.success) && state !== dismissed

    const statusId = `flag-default-${flagId}-status`

    useEffect(() => {
        if (!flashing) return
        const timer = window.setTimeout(() => setDismissed(state), FLASH_MS)
        return () => window.clearTimeout(timer)
    }, [flashing, state])

    // Rest -> saving -> saved. Every state names itself in words as well as
    // colour, so the control still reads on a monochrome pass (WCAG 1.4.1).
    let label = enabled ? 'Turn off' : 'Turn on'
    let icon = null
    if (pending) {
        label = 'Saving'
        icon = <IconLoader2 size={13} stroke={2} className="animate-spin" aria-hidden="true" />
    } else if (flashing) {
        label = 'Saved'
        icon = <IconCheck size={13} stroke={2.2} aria-hidden="true" />
    }

    const buttonState = pending ? 'pending' : flashing ? 'saved' : 'idle'

    return (
        <form action={formAction} className="flex flex-col items-center gap-1">
            <input type="hidden" name="flagId" value={flagId} />
            <input type="hidden" name="enabled" value={String(!enabled)} />

            <Button
                type="submit"
                size="sm"
                tone="secondary"
                // Locked while in flight and during the flash: this switch moves
                // every tenant at once, so a double-click landing two writes is
                // worth designing out.
                disabled={pending || flashing}
                data-armed={buttonState}
                aria-describedby={statusId}
                title={`Turn ${flagKey} ${enabled ? 'off' : 'on'} for every tenant without an override`}
            >
                {icon}
                {label}
            </Button>

            {/* Silent on success, since the button already says "Saved" and the
                Default pill in the same row has flipped. A failure takes a
                visible line, which is the right trade: an error an operator can
                miss is worse than a row that grows. */}
            <p
                id={statusId}
                role="status"
                aria-live="polite"
                className={
                    state.error
                        ? 'max-w-[220px] text-center text-[11px] leading-[1.35] text-[var(--p-danger-ink)]'
                        : 'sr-only'
                }
            >
                {state.error ? state.error : state.success && flashing ? state.success : ''}
            </p>
        </form>
    )
}

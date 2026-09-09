'use client'

import { useActionState, useEffect, useState } from 'react'
import { IconCheck, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/platform/ui'
import { setFeatureOverrideState } from '@/app/platform/actions'
import type { ActionState } from '@/app/platform/actions'

export type OverrideValue = 'inherit' | 'on' | 'off'

const INITIAL: ActionState = { error: null, success: null }

/** How long the "Saved" flash holds before the button returns to rest. */
const FLASH_MS = 2000

/**
 * Sets one tenant's override for one flag.
 *
 * Used by the per-tenant matrix on the flags page and by the feature table on
 * a tenant's own page, so the two cannot drift on what the control does or on
 * what "inherit" is called.
 *
 * The matrix is a grid of near-identical controls, so feedback has to be
 * local: a page-level toast would tell an operator that *something* saved
 * without saying which of forty cells it was. Everything this component
 * reports therefore happens inside the cell that was clicked.
 *
 * The button stays inert until the select actually differs from what is
 * stored. Re-submitting an unchanged value would write a row and an audit
 * entry recording nothing, and the flag trail is read to answer "who turned
 * this on for that gym", so padding it with no-ops has a real cost.
 */
export default function FlagOverrideCell({
    gymId,
    flagId,
    flagKey,
    tenantName,
    defaultEnabled,
    value: savedValue,
}: {
    gymId: string
    flagId: string
    flagKey: string
    tenantName: string
    defaultEnabled: boolean
    value: OverrideValue
}) {
    const [state, formAction, pending] = useActionState(setFeatureOverrideState, INITIAL)

    // Only the operator's pending selection is local state. What is *stored*
    // stays the server's `value` prop: the action revalidates this route, so
    // after a save the prop arrives already updated and the two agree without
    // this component having to assume the write landed. It also keeps the cell
    // honest when a different cell's save revalidates the page.
    const [choice, setChoice] = useState<OverrideValue>(savedValue)

    // The flash is derived, not stored, so nothing has to set state while
    // rendering. The timer only records which result has been shown.
    const [dismissed, setDismissed] = useState<ActionState | null>(null)
    const flashing = Boolean(state.success) && state !== dismissed

    useEffect(() => {
        if (!flashing) return
        const timer = window.setTimeout(() => setDismissed(state), FLASH_MS)
        return () => window.clearTimeout(timer)
    }, [flashing, state])

    const selectId = `flag-${gymId}-${flagId}`
    const statusId = `${selectId}-status`

    const dirty = choice !== savedValue
    const armed = dirty && !pending

    // Rest -> armed -> saving -> saved. Every state names itself in words, not
    // colour alone, so the cell still reads on a monochrome or colour-blind
    // pass (WCAG 1.4.1).
    let label = 'Set'
    let icon = null
    if (pending) {
        label = 'Saving'
        icon = <IconLoader2 size={13} stroke={2} className="animate-spin" aria-hidden="true" />
    } else if (flashing) {
        label = 'Saved'
        icon = <IconCheck size={13} stroke={2.2} aria-hidden="true" />
    }

    const buttonState = pending ? 'pending' : flashing ? 'saved' : armed ? 'true' : 'false'

    return (
        <form action={formAction} className="flex flex-col gap-1">
            <input type="hidden" name="gymId" value={gymId} />
            <input type="hidden" name="flagId" value={flagId} />
            <input type="hidden" name="value" value={choice} />

            <div className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor={selectId}>
                    {flagKey} for {tenantName}
                </label>
                <select
                    id={selectId}
                    value={choice}
                    disabled={pending}
                    aria-describedby={statusId}
                    onChange={(event) => setChoice(event.target.value as OverrideValue)}
                    className="p-input h-8 w-[104px] text-[12px]"
                >
                    <option value="inherit">Inherit ({defaultEnabled ? 'on' : 'off'})</option>
                    <option value="on">Force on</option>
                    <option value="off">Force off</option>
                </select>

                <Button
                    type="submit"
                    size="sm"
                    tone={armed ? 'primary' : 'secondary'}
                    disabled={!armed}
                    data-armed={buttonState}
                    title={
                        armed
                            ? `Apply ${flagKey} for ${tenantName}`
                            : 'Change the value first, then set it'
                    }
                >
                    {icon}
                    {label}
                </Button>
            </div>

            {/* One node for both channels: it stays mounted and silent so the
                live region is already in the accessibility tree when a message
                arrives, which is what makes the announcement fire reliably.
                Success stays audio-only, since the button itself already says
                "Saved" on screen. A failure does take a visible line and grow
                the row, which is the right trade: an error an operator can
                miss is worse than a row that moves. */}
            <p
                id={statusId}
                role="status"
                aria-live="polite"
                className={
                    state.error
                        ? 'max-w-[168px] text-[11px] leading-[1.35] text-[var(--p-danger-ink)]'
                        : 'sr-only'
                }
            >
                {state.error ? state.error : flashing ? `${flagKey} saved for ${tenantName}.` : ''}
            </p>
        </form>
    )
}

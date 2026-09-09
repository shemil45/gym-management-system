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
 * One cell of the per-tenant flag matrix.
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
    value: initialValue,
}: {
    gymId: string
    flagId: string
    flagKey: string
    tenantName: string
    defaultEnabled: boolean
    value: OverrideValue
}) {
    const [state, formAction, pending] = useActionState(setFeatureOverrideState, INITIAL)

    // `saved` is what the database holds, `value` is what the select shows.
    // The gap between the two is the whole interaction.
    const [saved, setSaved] = useState<OverrideValue>(initialValue)
    const [value, setValue] = useState<OverrideValue>(initialValue)
    const [flashing, setFlashing] = useState(false)

    const selectId = `flag-${gymId}-${flagId}`
    const statusId = `${selectId}-status`

    useEffect(() => {
        if (!state.success) return

        // The select is locked while the request is in flight, so the value
        // sitting here now is the one that was submitted.
        setSaved(value)
        setFlashing(true)
        const timer = window.setTimeout(() => setFlashing(false), FLASH_MS)
        return () => window.clearTimeout(timer)
        // `value` is deliberately not a dependency: this runs when a
        // submission resolves, not when someone edits the select afterwards.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state])

    const dirty = value !== saved
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
            <input type="hidden" name="value" value={value} />

            <div className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor={selectId}>
                    {flagKey} for {tenantName}
                </label>
                <select
                    id={selectId}
                    value={value}
                    disabled={pending}
                    aria-describedby={statusId}
                    onChange={(event) => setValue(event.target.value as OverrideValue)}
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

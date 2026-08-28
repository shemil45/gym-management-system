'use client'

import { useActionState, useState } from 'react'
import { IconAlertTriangle, IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react'
import { signInToPlatform, type ActionState } from '@/app/platform/actions'
import { Button, Field } from '@/components/platform/ui'

const INITIAL: ActionState = { error: null }

export default function PlatformLoginForm() {
    const [state, formAction, pending] = useActionState(signInToPlatform, INITIAL)
    const [revealed, setRevealed] = useState(false)

    return (
        <form action={formAction} className="flex flex-col gap-4">
            {/* Error sits above the fields and is announced, because a failed
                sign-in has no field to attach to - the credentials are checked
                as a pair. */}
            {state.error ? (
                <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-[var(--p-r-core)] border border-[var(--p-danger)] bg-[var(--p-danger-wash)] px-3.5 py-3"
                >
                    <IconAlertTriangle
                        size={15}
                        stroke={1.9}
                        className="mt-px shrink-0 text-[var(--p-danger-ink)]"
                        aria-hidden="true"
                    />
                    <p className="text-[12.5px] leading-[1.5] text-[var(--p-danger-ink)]">{state.error}</p>
                </div>
            ) : null}

            <Field label="Work email" name="email">
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    disabled={pending}
                    aria-invalid={state.error ? true : undefined}
                    className="p-input"
                />
            </Field>

            <Field label="Password" name="password">
                <div className="relative">
                    <input
                        id="password"
                        name="password"
                        type={revealed ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        disabled={pending}
                        aria-invalid={state.error ? true : undefined}
                        className="p-input pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setRevealed((value) => !value)}
                        aria-label={revealed ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[6px] text-[var(--p-ink-3)] transition-colors hover:text-[var(--p-ink)]"
                    >
                        {revealed ? (
                            <IconEyeOff size={15} stroke={1.8} />
                        ) : (
                            <IconEye size={15} stroke={1.8} />
                        )}
                    </button>
                </div>
            </Field>

            <Button type="submit" tone="primary" disabled={pending} className="mt-1 w-full">
                {pending ? (
                    <>
                        <IconLoader2 size={14} stroke={2} className="animate-spin" aria-hidden="true" />
                        Verifying access
                    </>
                ) : (
                    'Sign in'
                )}
            </Button>
        </form>
    )
}

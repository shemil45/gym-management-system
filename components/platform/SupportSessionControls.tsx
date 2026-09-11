'use client'

import { useTransition, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/platform/ui'

/*
  The three support-session controls, each acknowledging a click before the
  server has answered.

  Opening or ending a session writes a row, records an audit entry and
  redirects; resuming one loads the whole tenant workspace. All of that takes
  long enough that a button which did nothing visibly invited a second click,
  and a second "Open" would silently replace the session it just made.

  Same vocabulary as FlagOverrideCell: spinner, label swap, disabled. The
  submit variant reads pending state from the surrounding <form> so the
  server action stays a plain `action={...}` on the form, and the resume
  variant wraps the navigation in a transition so the page it is leaving can
  show that it is leaving.
*/

function Spinner() {
    return <IconLoader2 size={13} stroke={2} className="animate-spin" aria-hidden="true" />
}

/** Submit button for a form whose `action` is a server action. */
export function SessionSubmitButton({
    children,
    pendingLabel,
    tone = 'secondary',
    disabled,
    className,
}: {
    children: ReactNode
    pendingLabel: string
    tone?: 'primary' | 'secondary' | 'ghost' | 'danger'
    disabled?: boolean
    className?: string
}) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            tone={tone}
            size="sm"
            disabled={disabled || pending}
            aria-busy={pending || undefined}
            className={className}
        >
            {pending ? (
                <>
                    <Spinner />
                    {pendingLabel}
                </>
            ) : (
                children
            )}
        </Button>
    )
}

/** Navigates into the gym workspace for the open session. */
export function ResumeSessionButton({
    children,
    tone = 'primary',
}: {
    children: ReactNode
    tone?: 'primary' | 'secondary'
}) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    return (
        <Button
            type="button"
            tone={tone}
            size="sm"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => startTransition(() => router.push('/admin/dashboard'))}
        >
            {pending ? (
                <>
                    <Spinner />
                    Opening
                </>
            ) : (
                children
            )}
        </Button>
    )
}

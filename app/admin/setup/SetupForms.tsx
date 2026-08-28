'use client'

import { useActionState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import {
    claimSubdomain,
    finishOnboarding,
    saveContactDetails,
    type SetupState,
} from '@/app/admin/setup/actions'

const INITIAL: SetupState = { error: null, success: null }

const inputClass =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400'

const labelClass = 'block text-xs font-semibold text-gray-700'

function Feedback({ state }: { state: SetupState }) {
    if (state.error) {
        return (
            <p role="alert" className="text-xs font-medium text-red-600">
                {state.error}
            </p>
        )
    }
    if (state.success) {
        return (
            <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {state.success}
            </p>
        )
    }
    return null
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            {children}
        </button>
    )
}

export function ContactForm({
    defaultEmail,
    defaultPhone,
}: {
    defaultEmail: string
    defaultPhone: string
}) {
    const [state, action, pending] = useActionState(saveContactDetails, INITIAL)

    return (
        <form action={action} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label htmlFor="contact_email" className={labelClass}>
                        Contact email
                    </label>
                    <input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        defaultValue={defaultEmail}
                        placeholder="owner@yourgym.com"
                        className={inputClass}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="contact_phone" className={labelClass}>
                        Contact phone
                    </label>
                    <input
                        id="contact_phone"
                        name="contact_phone"
                        type="tel"
                        defaultValue={defaultPhone}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                    />
                </div>
            </div>
            <Feedback state={state} />
            <div>
                <SubmitButton pending={pending}>Save contact details</SubmitButton>
            </div>
        </form>
    )
}

export function SubdomainForm({ defaultValue }: { defaultValue: string }) {
    const [state, action, pending] = useActionState(claimSubdomain, INITIAL)

    return (
        <form action={action} className="flex flex-col gap-3">
            <div className="space-y-1.5">
                <label htmlFor="subdomain" className={labelClass}>
                    Web address
                </label>
                <div className="flex items-stretch">
                    <input
                        id="subdomain"
                        name="subdomain"
                        type="text"
                        defaultValue={defaultValue}
                        placeholder="iron-temple"
                        required
                        minLength={3}
                        maxLength={40}
                        pattern="[a-zA-Z0-9\-]+"
                        aria-describedby="subdomain-hint"
                        className={`${inputClass} rounded-r-none`}
                    />
                    <span className="flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                        .gmscloud.app
                    </span>
                </div>
                <p id="subdomain-hint" className="text-xs text-gray-500">
                    Letters, numbers and dashes. This is what members type to reach you, so it is worth
                    getting right.
                </p>
            </div>
            <Feedback state={state} />
            <div>
                <SubmitButton pending={pending}>
                    {defaultValue ? 'Update web address' : 'Claim web address'}
                </SubmitButton>
            </div>
        </form>
    )
}

export function FinishForm({ ready }: { ready: boolean }) {
    const [state, action, pending] = useActionState(finishOnboarding, INITIAL)

    return (
        <form action={action} className="flex flex-col gap-3">
            <Feedback state={state} />
            <div>
                <button
                    type="submit"
                    disabled={pending || !ready}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                    {ready ? 'Finish setup' : 'Complete the steps above first'}
                </button>
            </div>
        </form>
    )
}

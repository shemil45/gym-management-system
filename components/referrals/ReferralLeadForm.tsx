'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, MapPin, Phone } from 'lucide-react'
import type { SubmitLeadResult } from '@/lib/referrals/server'

type Props = {
    gymName: string
    gymLogoUrl: string | null
    /** Gym contact number; null hides the Contact button. */
    gymPhone: string | null
    /** Gym street address; null makes Get directions explain it is unavailable. */
    gymAddress: string | null
    referrerFirstName: string
    validityDays: number
    /** Outcome carried in the URL so a refresh keeps the confirmation. */
    initialOutcome?: 'submitted' | 'already-member' | null
    action: (formData: FormData) => Promise<SubmitLeadResult>
}

const inputClass =
    'w-full rounded-lg border border-[#c6c6cd] bg-white px-3.5 py-2.5 text-sm text-[#191c1e] outline-none transition-shadow placeholder:text-[#76777d] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-[#4c4546] dark:bg-[#141416] dark:text-white dark:placeholder:text-[#988e90]'
const labelClass = 'block text-xs font-semibold tracking-[0.01em] text-[#191c1e] dark:text-[#e4e1e6]'

/**
 * Three fields and a button. Field-level errors come back from the server
 * action so what the visitor sees is exactly what was rejected; the
 * success and "already a member" outcomes replace the form.
 */
export default function ReferralLeadForm({ gymName, gymLogoUrl, gymPhone, gymAddress, referrerFirstName, validityDays, initialOutcome = null, action }: Props) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [outcome, setOutcomeState] = useState<'submitted' | 'already-member' | null>(initialOutcome)
    const [referredBy, setReferredBy] = useState<string | null>(null)

    // The outcome is written to the URL as well as state, so a refresh (or
    // the back button) shows the confirmation instead of an empty form.
    function setOutcome(next: 'submitted' | 'already-member') {
        setOutcomeState(next)
        router.replace(`?done=${next === 'submitted' ? '1' : 'member'}`, { scroll: false })
    }
    // A logo that fails to load is dropped rather than shown as a broken image.
    const [logoFailed, setLogoFailed] = useState(false)

    function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        setFieldError(null)
        setFormError(null)
        setReferredBy(null)
        startTransition(async () => {
            let result: SubmitLeadResult
            try {
                result = await action(formData)
            } catch {
                setFormError('Something went wrong. Please try again.')
                return
            }
            if (result.ok) {
                setOutcome('submitted')
                return
            }
            if (result.kind === 'validation') setFieldError({ field: result.field, message: result.message })
            else if (result.kind === 'already-member') setOutcome('already-member')
            else if (result.kind === 'already-referred') setReferredBy(result.referrerName)
            else if (result.kind === 'link-invalid') setFormError('This referral link is no longer valid. Ask your friend to share it again.')
            else setFormError(result.message)
        })
    }

    return (
        <div className="relative w-full max-w-100 text-sm">
            <div className="rounded-xl border border-[#c6c6cd] bg-white p-5 shadow-[0px_4px_6px_rgba(15,23,42,0.05)] sm:p-8 dark:border-[#27272a] dark:bg-[#0e0e11]">
                {outcome === 'submitted' ? (
                    <Done
                        title="You're all set!"
                        lines={[
                            `Your details have been shared with ${gymName}.`,
                            'Visit the gym to complete your registration.',
                            `Your referral is valid for ${validityDays} days.`,
                        ]}
                        actions={<GymActions gymName={gymName} phone={gymPhone} address={gymAddress} />}
                    />
                ) : outcome === 'already-member' ? (
                    <Done
                        title={`You are already an existing member of ${gymName}`}
                        lines={[
                            'This mobile number or email is already on a membership at this gym, so a referral is not needed.',
                            'Speak to the front desk if you think this is a mistake.',
                        ]}
                    />
                ) : (
                    <>
                        <div className="mb-6 text-center">
                            {gymLogoUrl && !logoFailed ? (
                                <Image
                                    src={gymLogoUrl}
                                    alt=""
                                    width={56}
                                    height={56}
                                    onError={() => setLogoFailed(true)}
                                    className="mx-auto mb-4 h-14 w-14 rounded-xl object-cover"
                                />
                            ) : null}
                            <h1 className="text-2xl leading-[1.1] tracking-[-0.02em] font-bold text-[#191c1e] sm:text-3xl dark:text-white">
                                You&apos;ve been invited to join {gymName}
                            </h1>
                            <p className="mt-2 text-sm font-medium text-[#45464d] dark:text-[#cfc4c5]/70">
                                {referrerFirstName} referred you. Complete your details and visit the gym to finish your registration.
                            </p>
                        </div>

                        {formError || referredBy ? (
                            <div
                                role="alert"
                                className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                            >
                                {referredBy ? (
                                    <>
                                        <p className="font-semibold">You have already been referred by {referredBy}.</p>
                                        <p className="mt-0.5">
                                            This mobile number or email already has an open referral at {gymName}. Visit the gym to complete your registration.
                                        </p>
                                    </>
                                ) : (
                                    formError
                                )}
                            </div>
                        ) : null}

                        <form onSubmit={onSubmit} className="space-y-5" noValidate>
                            {/* Honeypot; hidden from people, filled by bots. */}
                            <div className="hidden" aria-hidden="true">
                                <label htmlFor="website">Website</label>
                                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                            </div>

                            <Field id="full_name" label="Full name" error={fieldError?.field === 'fullName' ? fieldError.message : null}>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Your full name"
                                    required
                                    disabled={pending}
                                    className={inputClass}
                                />
                            </Field>

                            <Field id="phone" label="Mobile number" error={fieldError?.field === 'phone' ? fieldError.message : null}>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    placeholder="10-digit mobile number"
                                    required
                                    disabled={pending}
                                    className={inputClass}
                                />
                            </Field>

                            <Field id="email" label="Email address" error={fieldError?.field === 'email' ? fieldError.message : null}>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="name@example.com"
                                    required
                                    disabled={pending}
                                    className={inputClass}
                                />
                            </Field>

                            <button
                                type="submit"
                                disabled={pending}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
                            >
                                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                {pending ? 'Submitting…' : 'Submit'}
                            </button>
                        </form>

                        <p className="mt-5 text-center text-xs text-[#76777d] dark:text-[#988e90]">
                            The gym uses these details only to complete your registration when you visit.
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

function Field({ id, label, error, children }: { id: string; label: string; error: string | null; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className={labelClass}>
                {label}
            </label>
            {children}
            {error ? (
                <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-300">
                    {error}
                </p>
            ) : null}
        </div>
    )
}

function Done({ title, lines, actions }: { title: string; lines: string[]; actions?: React.ReactNode }) {
    return (
        <div className="text-center" role="status">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl leading-[1.1] tracking-[-0.02em] font-bold text-[#191c1e] dark:text-white">{title}</h1>
            <div className="mt-3 space-y-1 text-sm text-[#45464d] dark:text-[#cfc4c5]/70">
                {lines.map((line) => (
                    <p key={line}>{line}</p>
                ))}
            </div>
            {actions}
        </div>
    )
}

const actionClass =
    'flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors'

/**
 * Two ways to follow through: call the gym, or open directions to it.
 * Directions need a stored address; without one the button explains that
 * instead of opening an empty map.
 */
function GymActions({ gymName, phone, address }: { gymName: string; phone: string | null; address: string | null }) {
    const [directionsNote, setDirectionsNote] = useState<string | null>(null)
    const directionsHref = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${gymName}, ${address}`)}` : null

    return (
        <div className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row">
                {phone ? (
                    <a
                        href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                        className={`${actionClass} border-transparent bg-black text-white hover:opacity-90 dark:bg-white dark:text-black`}
                    >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        Contact gym
                    </a>
                ) : null}
                {directionsHref ? (
                    <a
                        href={directionsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${actionClass} border-[#c6c6cd] bg-white text-[#191c1e] hover:bg-[#f7f9fb] dark:border-[#4c4546] dark:bg-transparent dark:text-[#e4e1e6] dark:hover:bg-[#1f1f22]`}
                    >
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        Get directions
                    </a>
                ) : (
                    <button
                        type="button"
                        onClick={() => setDirectionsNote(`${gymName} has not added its address yet, so directions are unavailable. Ask the gym when you call.`)}
                        className={`${actionClass} border-[#c6c6cd] bg-white text-[#191c1e] hover:bg-[#f7f9fb] dark:border-[#4c4546] dark:bg-transparent dark:text-[#e4e1e6] dark:hover:bg-[#1f1f22]`}
                    >
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        Get directions
                    </button>
                )}
            </div>
            {directionsNote ? (
                <p role="alert" className="mt-3 text-xs text-[#76777d] dark:text-[#988e90]">
                    {directionsNote}
                </p>
            ) : null}
        </div>
    )
}

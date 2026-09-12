import { IconLock, IconMail, IconPhone, IconShieldCheck } from '@tabler/icons-react'

/**
 * Replaces the member portal while the gym's GMS Cloud subscription is
 * lapsed. Members are not told why - the gym's billing relationship with
 * us is not theirs to see - only that the portal is paused and how to reach
 * the gym.
 */
export default function PortalUnavailable({
    phone,
    email,
}: {
    phone: string | null
    email: string | null
}) {
    const hasContact = Boolean(phone || email)

    return (
        <div className="flex min-h-[calc(100dvh-var(--m-topbar))] items-center justify-center px-4 py-12 lg:min-h-[calc(100dvh-var(--m-header))]">
            <div className="renew-reveal w-full max-w-md" style={{ animationDelay: '60ms' }}>
                <div
                    className="rounded-[var(--m-r-shell)] p-1.5"
                    style={{ background: 'var(--m-bg-sunk)', boxShadow: 'inset 0 0 0 1px var(--m-line-soft)' }}
                >
                    <div
                        className="rounded-[var(--m-r-core)] px-6 py-9 text-center"
                        style={{ background: 'var(--m-surface)', boxShadow: 'var(--m-shadow)' }}
                    >
                        <span
                            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                            style={{ background: 'var(--m-warn-wash)', color: 'var(--m-warn-ink)' }}
                        >
                            <IconLock size={20} stroke={1.25} />
                        </span>

                        <p
                            className="mt-6 text-[10px] font-medium uppercase tracking-[0.22em]"
                            style={{ color: 'var(--m-ink-3)' }}
                        >
                            Member portal
                        </p>
                        <h1
                            className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em]"
                            style={{ color: 'var(--m-ink)' }}
                        >
                            Temporarily unavailable
                        </h1>
                        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--m-ink-2)' }}>
                            The member portal is temporarily unavailable. Please check back soon, or get in
                            touch with the gym if you need anything right away.
                        </p>

                        {hasContact ? (
                            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                                {phone ? (
                                    <a
                                        href={`tel:${phone}`}
                                        className="m-tap inline-flex h-11 items-center justify-center gap-2 rounded-[var(--m-r-control)] px-4 text-[14px] font-medium transition-transform duration-200 active:scale-[0.98]"
                                        style={{ background: 'var(--m-ink)', color: 'var(--m-surface)' }}
                                    >
                                        <IconPhone size={16} stroke={1.5} />
                                        Call gym
                                    </a>
                                ) : null}
                                {email ? (
                                    <a
                                        href={`mailto:${email}`}
                                        className="m-tap inline-flex h-11 items-center justify-center gap-2 rounded-[var(--m-r-control)] px-4 text-[14px] font-medium transition-transform duration-200 active:scale-[0.98]"
                                        style={{
                                            background: 'var(--m-surface)',
                                            color: 'var(--m-ink)',
                                            boxShadow: 'inset 0 0 0 1px var(--m-line)',
                                        }}
                                    >
                                        <IconMail size={16} stroke={1.5} />
                                        Email gym
                                    </a>
                                ) : null}
                            </div>
                        ) : null}

                        <div
                            className="mt-7 flex items-start gap-3 rounded-[var(--m-r-control)] p-3.5 text-left"
                            style={{ background: 'var(--m-accent-wash)', color: 'var(--m-accent-wash-ink)' }}
                        >
                            <IconShieldCheck size={18} stroke={1.25} className="mt-0.5 shrink-0" />
                            <p className="text-[13px] leading-relaxed">
                                Your membership, payments, and progress are all safely retained. Nothing has been
                                deleted.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

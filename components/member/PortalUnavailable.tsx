import { IconLock, IconShieldCheck } from '@tabler/icons-react'

/**
 * Replaces the member portal while the gym's GMS Cloud subscription is
 * lapsed. Members are not the ones who can fix this, so there is nothing
 * to click - just a clear, unalarming explanation and who to ask.
 */
export default function PortalUnavailable({ gymName }: { gymName: string }) {
    return (
        <div className="flex min-h-[100dvh] items-center justify-center px-4 py-16">
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
                            {gymName}&rsquo;s GMS Cloud subscription is not active right now, so the member portal is
                            paused. Please contact your gym for help.
                        </p>

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

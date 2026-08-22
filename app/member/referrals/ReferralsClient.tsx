'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconCheck, IconCopy, IconGift, IconShare2 } from '@tabler/icons-react'
import { Button, Card, Pill, Screen, SectionHeading, Stack } from '@/components/member/ui'

export default function ReferralsClient({
    code,
    credits,
    gymName,
    referrals,
}: {
    code: string
    credits: number
    gymName: string
    referrals: { name: string; joinedAt: string; status: string }[]
}) {
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 2000)
        return () => clearTimeout(timer)
    }, [copied])

    const message = `Join me at ${gymName}. Use my code ${code} when you sign up.`

    async function share() {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ text: message })
                return
            } catch {
                /* user dismissed the sheet */
            }
        }
        try {
            await navigator.clipboard.writeText(message)
            toast.success('Invite copied')
        } catch {
            toast.error('Could not copy the invite')
        }
    }

    async function copyCode() {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
        } catch {
            /* the code is on screen anyway */
        }
    }

    return (
        <Screen title="Refer a friend">
            <Stack gap={14}>
                <Card className="p-5 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                        <IconGift size={24} stroke={1.7} />
                    </span>
                    <p className="mt-4 text-[13px] font-medium text-[var(--m-ink-2)]">
                        Your credit balance
                    </p>
                    <p className="m-num mt-1 text-[40px] font-semibold leading-none">{credits}</p>
                    <p className="mx-auto mt-3 max-w-[34ch] text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                        Credits come off your next renewal. Your friend gets a discount on their
                        first plan.
                    </p>

                    <button
                        type="button"
                        onClick={copyCode}
                        className="m-tap mx-auto mt-5 flex h-12 items-center gap-2.5 rounded-full border border-[var(--m-line)] bg-[var(--m-surface-2)] px-5"
                    >
                        <span className="m-num text-[17px] font-semibold tracking-[0.1em]">
                            {code}
                        </span>
                        {copied ? (
                            <IconCheck
                                size={17}
                                stroke={2.2}
                                className="text-[var(--m-accent-strong)]"
                            />
                        ) : (
                            <IconCopy size={17} stroke={1.8} className="text-[var(--m-ink-3)]" />
                        )}
                    </button>

                    <Button
                        tone="primary"
                        full
                        className="mt-3"
                        onClick={share}
                        leadingIcon={<IconShare2 size={17} stroke={1.9} />}
                    >
                        Share invite
                    </Button>
                </Card>

                <SectionHeading>People you referred</SectionHeading>
                {referrals.length === 0 ? (
                    <Card className="px-5 py-8 text-center">
                        <p className="text-[14.5px] font-semibold">No referrals yet</p>
                        <p className="mx-auto mt-1.5 max-w-[32ch] text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                            Share your code and anyone who joins with it shows up here.
                        </p>
                    </Card>
                ) : (
                    <Card className="m-divide overflow-hidden">
                        {referrals.map((referral) => (
                            <div
                                key={`${referral.name}-${referral.joinedAt}`}
                                className="flex min-h-[56px] items-center gap-3 px-4 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-medium">
                                        {referral.name}
                                    </p>
                                    <p className="mt-0.5 text-[12.5px] text-[var(--m-ink-3)]">
                                        Joined{' '}
                                        {new Date(referral.joinedAt).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </p>
                                </div>
                                <Pill tone={referral.status === 'applied' ? 'accent' : 'neutral'}>
                                    {referral.status === 'applied' ? 'Credited' : 'Pending'}
                                </Pill>
                            </div>
                        ))}
                    </Card>
                )}
            </Stack>
        </Screen>
    )
}

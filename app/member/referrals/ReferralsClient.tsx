'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconBrandWhatsapp, IconCheck, IconCopy, IconGift, IconLink, IconShare2 } from '@tabler/icons-react'
import { Button, Card, Pill, Screen, SectionHeading, Stack } from '@/components/member/ui'
import type { ReferralStatus } from '@/lib/referrals/lead'

type ReferralItem = { name: string; at: string; status: ReferralStatus }

const STATUS_LABEL: Record<ReferralStatus, { label: string; tone: 'neutral' | 'accent' | 'warn' | 'danger' }> = {
    pending: { label: 'Pending', tone: 'warn' },
    converted: { label: 'Joined', tone: 'accent' },
    expired: { label: 'Expired', tone: 'neutral' },
    cancelled: { label: 'Cancelled', tone: 'neutral' },
}

/**
 * The link is the invitation. A friend who opens it lands on a form that
 * already knows the gym and the referrer, so there is nothing to type at the
 * desk. The member ID stays visible as a fallback for the front desk.
 */
export default function ReferralsClient({
    code,
    link,
    credits,
    gymName,
    referrals,
}: {
    code: string
    /** Null only when the gym has no public slug yet. */
    link: string | null
    credits: number
    gymName: string
    referrals: ReferralItem[]
}) {
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 2000)
        return () => clearTimeout(timer)
    }, [copied])

    const message = link
        ? `Join me at ${gymName}! Fill in your details here and visit the gym to finish signing up: ${link}`
        : `Join me at ${gymName}. Use my code ${code} when you sign up.`
    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(link ?? code)
            setCopied(true)
            toast.success(link ? 'Link copied' : 'Code copied')
        } catch {
            toast.error('Could not copy')
        }
    }

    async function share() {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share(link ? { title: `Join ${gymName}`, text: message, url: link } : { text: message })
                return
            } catch {
                /* user dismissed the sheet */
            }
        }
        await copyLink()
    }

    return (
        <Screen title="Refer a friend">
            <Stack gap={14}>
                <Card className="p-5">
                    <div className="text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                            <IconGift size={24} stroke={1.7} />
                        </span>
                        <p className="mt-4 text-[15.5px] font-semibold tracking-[-0.01em]">Share your personal referral link</p>
                        <p className="mx-auto mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                            Your friend fills in their name and number, then visits {gymName} to finish
                            joining. You earn credits when they do.
                        </p>
                    </div>

                    {link ? (
                        <button
                            type="button"
                            onClick={copyLink}
                            aria-label="Copy referral link"
                            className="m-tap mt-5 flex h-12 w-full items-center gap-2.5 rounded-full border border-[var(--m-line)] bg-[var(--m-surface-2)] px-4 text-left"
                        >
                            <IconLink size={17} stroke={1.8} className="shrink-0 text-[var(--m-ink-3)]" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--m-ink-2)]">
                                {link.replace(/^https?:\/\//, '')}
                            </span>
                            {copied ? (
                                <IconCheck size={17} stroke={2.2} className="shrink-0 text-[var(--m-accent-strong)]" />
                            ) : (
                                <IconCopy size={17} stroke={1.8} className="shrink-0 text-[var(--m-ink-3)]" />
                            )}
                        </button>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <Button tone="quiet" full onClick={copyLink} leadingIcon={<IconCopy size={17} stroke={1.9} />}>
                            {copied ? 'Copied' : 'Copy link'}
                        </Button>
                        <Button tone="primary" full onClick={share} leadingIcon={<IconShare2 size={17} stroke={1.9} />}>
                            Share
                        </Button>
                    </div>
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="m-tap mt-2.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-transparent bg-[#25D366] text-[14px] font-semibold tracking-[-0.01em] text-white"
                    >
                        <IconBrandWhatsapp size={18} stroke={1.9} />
                        <span>Send on WhatsApp</span>
                    </a>

                    <p className="mt-4 text-center text-[12px] text-[var(--m-ink-3)]">
                        Your credit balance: <span className="m-num font-semibold text-[var(--m-ink)]">{credits}</span>
                        {' · '}
                        Front-desk code: <span className="m-num font-semibold tracking-[0.06em] text-[var(--m-ink)]">{code}</span>
                    </p>
                </Card>

                <SectionHeading>People you referred</SectionHeading>
                {referrals.length === 0 ? (
                    <Card className="px-5 py-8 text-center">
                        <p className="text-[14.5px] font-semibold">No referrals yet</p>
                        <p className="mx-auto mt-1.5 max-w-[32ch] text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                            Share your link. Anyone who fills it in shows up here, and moves to Joined once
                            they register at the gym.
                        </p>
                    </Card>
                ) : (
                    <Card className="m-divide overflow-hidden">
                        {referrals.map((referral) => {
                            const status = STATUS_LABEL[referral.status]
                            return (
                                <div
                                    key={`${referral.name}-${referral.at}`}
                                    className="flex min-h-[56px] items-center gap-3 px-4 py-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-medium">{referral.name}</p>
                                        <p className="mt-0.5 text-[12.5px] text-[var(--m-ink-3)]">
                                            {referral.status === 'converted' ? 'Joined' : 'Signed up'}{' '}
                                            {new Date(referral.at).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                    <Pill tone={status.tone}>{status.label}</Pill>
                                </div>
                            )
                        })}
                    </Card>
                )}
            </Stack>
        </Screen>
    )
}

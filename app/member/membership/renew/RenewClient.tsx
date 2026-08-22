'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconCheck, IconCoin, IconShieldCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/currency'
import type { PlanOption } from '@/lib/member/portal-data'
import { Card, EmptyState, Pill, Screen, Stack } from '@/components/member/ui'

/*
  Renewal.

  Plans are cards, one per row on mobile so the price and term never compete for
  width, and the confirm bar is pinned above the bottom nav so the decision and
  the action are both in the thumb zone. Checkout itself is presentational for
  now.
*/

export default function RenewClient({
    plans,
    currentPlanName,
    credits,
}: {
    plans: PlanOption[]
    currentPlanName: string | null
    credits: number
}) {
    const [selected, setSelected] = useState<string | null>(plans[0]?.id ?? null)
    const [useCredits, setUseCredits] = useState(credits > 0)

    if (plans.length === 0) {
        return (
            <Screen title="Renew plan">
                <EmptyState
                    icon={<IconCoin size={26} stroke={1.6} />}
                    title="No plans available online"
                    body="This gym has not published any plans for self-service renewal. The front desk can renew you in person."
                />
            </Screen>
        )
    }

    const plan = plans.find((p) => p.id === selected) ?? plans[0]
    const discount = useCredits ? Math.min(credits, Math.round(plan.price * 0.2)) : 0
    const total = Math.max(0, plan.price - discount)

    return (
        <Screen title="Renew plan">
            <Stack gap={14}>
                <ul className="flex flex-col gap-3">
                    {plans.map((option) => {
                        const active = option.id === plan.id
                        const isCurrent = option.name === currentPlanName
                        return (
                            <li key={option.id}>
                                <button
                                    type="button"
                                    onClick={() => setSelected(option.id)}
                                    aria-pressed={active}
                                    className={cn(
                                        'm-tap w-full rounded-[var(--m-r-shell)] border p-4 text-left',
                                        active
                                            ? 'border-[var(--m-ink)] bg-[var(--m-surface)] shadow-[var(--m-shadow-lift)]'
                                            : 'border-[var(--m-line)] bg-[var(--m-surface)]',
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                                                active
                                                    ? 'border-[var(--m-ink)] bg-[var(--m-ink)] text-[var(--m-bg)]'
                                                    : 'border-[var(--m-line)]',
                                            )}
                                        >
                                            {active ? <IconCheck size={12} stroke={3} /> : null}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-[15.5px] font-semibold tracking-[-0.015em]">
                                                    {option.name}
                                                </p>
                                                {isCurrent ? <Pill>Current</Pill> : null}
                                            </div>
                                            <p className="m-num mt-1 text-[13px] text-[var(--m-ink-2)]">
                                                {option.durationDays} days
                                            </p>
                                            {option.description ? (
                                                <p className="mt-2 text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                                                    {option.description}
                                                </p>
                                            ) : null}
                                            {option.features.length > 0 ? (
                                                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                                                    {option.features.slice(0, 4).map((f) => (
                                                        <li key={f}>
                                                            <Pill>{f}</Pill>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                        </div>

                                        <p className="m-num shrink-0 text-[17px] font-semibold">
                                            {formatCurrency(option.price)}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        )
                    })}
                </ul>

                {credits > 0 ? (
                    <Card className="flex items-center gap-3 p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                            <IconCoin size={19} stroke={1.8} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium">Use referral credits</p>
                            <p className="m-num mt-0.5 text-[12.5px] text-[var(--m-ink-3)]">
                                {credits} available
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={useCredits}
                            aria-label="Use referral credits"
                            onClick={() => setUseCredits((v) => !v)}
                            /* 44px tap target around a 32px track. */
                            className="m-tap flex h-11 w-14 shrink-0 items-center"
                        >
                            <span
                                className={cn(
                                    'relative block h-8 w-14 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                                    useCredits
                                        ? 'bg-[var(--m-accent-strong)]'
                                        : 'bg-[var(--m-surface-2)]',
                                )}
                            >
                                <span
                                    className={cn(
                                        'absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                                        useCredits ? 'translate-x-7' : 'translate-x-1',
                                    )}
                                />
                            </span>
                        </button>
                    </Card>
                ) : null}

                {/* Clears the pinned confirm bar so the last card is never covered. */}
                <p className="flex items-center justify-center gap-2 pb-24 text-[12.5px] text-[var(--m-ink-3)] lg:pb-0">
                    <IconShieldCheck size={15} stroke={1.8} />
                    Payment is processed by the gym, receipts appear in Payments.
                </p>
            </Stack>

            {/* Confirm bar sits directly above the bottom nav so price and action
                are both reachable without moving the hand. */}
            <div className="m-confirmbar z-30 border-t border-[var(--m-line)] bg-[var(--m-bg)]/95 px-5 py-3 backdrop-blur-xl lg:mt-6 lg:rounded-[var(--m-r-shell)] lg:border lg:px-4">
                <div className="mx-auto flex max-w-[720px] items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] text-[var(--m-ink-3)]">
                            {plan.name}, {plan.durationDays} days
                        </p>
                        <p className="flex items-baseline gap-2">
                            <span className="m-num text-[20px] font-semibold leading-tight">
                                {formatCurrency(total)}
                            </span>
                            {discount > 0 ? (
                                <span className="shrink-0 text-[12px] font-medium text-[var(--m-accent-strong)]">
                                    saved {formatCurrency(discount)}
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            toast('Checkout is not wired up yet', {
                                description: `${plan.name} for ${formatCurrency(total)} would go to payment here.`,
                            })
                        }
                        className="m-tap h-12 shrink-0 rounded-full bg-[var(--m-ink)] px-6 text-[14px] font-semibold text-[var(--m-bg)]"
                    >
                        Pay now
                    </button>
                </div>
            </div>
        </Screen>
    )
}

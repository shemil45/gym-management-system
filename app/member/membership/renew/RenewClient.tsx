'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IconCheck, IconCoin, IconLoader2, IconShieldCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/currency'
import type { PlanOption } from '@/lib/member/portal-data'
import { EmptyState, Pill, Screen, Stack } from '@/components/member/ui'
import { createRazorpayOrder } from '@/app/member/plans/actions'
import { checkoutStorageKey, type StoredCheckoutPayload } from '@/lib/payments/razorpay-checkout'

/*
  Renewal.

  Plans are cards, one per row on mobile so the price and term never compete for
  width, and the confirm bar is pinned above the bottom nav so the decision and
  the action are both in the thumb zone.

  "Pay now" only creates the order. The amount shown here is a preview: the
  server re-prices the plan and reserves referral coins inside
  `createRazorpayOrder`, so the credit arithmetic below mirrors that action
  rather than inventing its own discount. The order is parked in sessionStorage
  and the member is sent straight to `/member/payments/result`, which opens
  Razorpay over its processing screen and verifies the signature server-side.
  Moving first means a declined or abandoned payment never leaves the member
  staring at a disabled button while the failure is recorded.
*/

export default function RenewClient({
    plans,
    currentPlanName,
    credits,
    gymName,
}: {
    plans: PlanOption[]
    currentPlanName: string | null
    credits: number
    gymName: string
}) {
    const router = useRouter()
    const [selected, setSelected] = useState<string | null>(plans[0]?.id ?? null)
    const [useCredits, setUseCredits] = useState(credits > 0)
    const [paying, setPaying] = useState(false)

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
    // Mirrors `getPurchaseContext`: coins offset the price rupee for rupee, up
    // to the full price. Any other rule here would quote a total the gateway
    // then contradicts.
    const discount = useCredits ? Math.min(credits, plan.price) : 0
    const total = Math.max(0, plan.price - discount)

    const handlePay = async () => {
        setPaying(true)

        const order = await createRazorpayOrder(plan.id, useCredits)

        if ('error' in order) {
            setPaying(false)
            toast.error(order.error)
            return
        }

        // Coins covered the whole plan, so the server already applied the
        // membership and there is nothing to collect.
        if (order.amount === 0) {
            router.push(
                `/member/payments/result?status=success&invoice=${encodeURIComponent(order.invoiceNumber)}`,
            )
            return
        }

        const payload: StoredCheckoutPayload = {
            order,
            gymName,
            planId: plan.id,
            planName: plan.name,
            useReferralCoins: useCredits,
        }
        sessionStorage.setItem(checkoutStorageKey(order.invoiceNumber), JSON.stringify(payload))
        router.push(
            `/member/payments/result?status=processing&invoice=${encodeURIComponent(order.invoiceNumber)}`,
        )
    }

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

                {/* Clears the pinned confirm bar so the last card is never
                    covered; the bar is a row taller when credits are offered. */}
                <p
                    className={cn(
                        'flex items-center justify-center gap-2 text-[12.5px] text-[var(--m-ink-3)] lg:pb-0',
                        credits > 0 ? 'pb-40' : 'pb-24',
                    )}
                >
                    <IconShieldCheck size={15} stroke={1.8} />
                    Secured by Razorpay, your receipt appears in Payments.
                </p>
            </Stack>

            {/* Confirm bar sits directly above the bottom nav so price and action
                are both reachable without moving the hand. */}
            <div className="m-confirmbar z-30 border-t border-[var(--m-line)] bg-[var(--m-bg)]/95 px-5 py-3 backdrop-blur-xl lg:mt-6 lg:rounded-[var(--m-r-shell)] lg:border lg:px-4">
                {/* Credits live in the bar, not the scroll: the decision that
                    changes the price sits next to the price it changes. */}
                {credits > 0 ? (
                    <div className="mx-auto mb-2.5 flex max-w-[720px] items-center gap-3 border-b border-[var(--m-line)] pb-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                            <IconCoin size={16} stroke={1.8} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-medium leading-tight">Use referral credits</p>
                            <p className="m-num mt-0.5 text-[12px] text-[var(--m-ink-3)]">{credits} available</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={useCredits}
                            aria-label="Use referral credits"
                            onClick={() => setUseCredits((v) => !v)}
                            /* 44px tap target around a 28px track. */
                            className="m-tap flex h-11 w-12 shrink-0 items-center justify-end"
                        >
                            <span
                                className={cn(
                                    'relative block h-7 w-12 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                                    /* --m-line, not --m-surface-2: in light mode surface-2
                                       is within 0.01 L of the bar behind it and the off
                                       track disappears under the white knob. */
                                    useCredits ? 'bg-[var(--m-accent-strong)]' : 'bg-[var(--m-line)]',
                                )}
                            >
                                <span
                                    className={cn(
                                        /* Anchored at left-1: without it the knob's static
                                           position already sits partway along the track and
                                           the on-state translate carries it past the edge. */
                                        'absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                                        useCredits ? 'translate-x-5' : 'translate-x-0',
                                    )}
                                />
                            </span>
                        </button>
                    </div>
                ) : null}
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
                        onClick={handlePay}
                        disabled={paying}
                        aria-busy={paying}
                        className="m-tap flex h-12 shrink-0 items-center gap-2 rounded-full bg-[var(--m-ink)] px-6 text-[14px] font-semibold text-[var(--m-bg)] disabled:opacity-60"
                    >
                        {paying ? (
                            <IconLoader2 size={16} stroke={2} className="animate-spin" />
                        ) : null}
                        {paying ? 'Opening' : total === 0 ? 'Confirm' : 'Pay now'}
                    </button>
                </div>
            </div>
        </Screen>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    AlertTriangle,
    ArrowLeft,
    BadgeCheck,
    CalendarClock,
    Check,
    CreditCard,
    Info,
    Loader2,
    Receipt,
    Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { openRazorpayCheckout } from '@/lib/payments/razorpay-checkout'
import {
    cancelScheduledChange,
    cancelSubscription,
    confirmPlanCheckout,
    resumeSubscription,
    startPlanCheckout,
} from '@/app/admin/settings/subscription/actions'

/* ── types mirrored from the server view ───────────────────────────────── */

type Tone = 'ok' | 'info' | 'warn' | 'danger' | 'idle'

export type PlanOption = {
    id: string
    name: string
    code: string
    description: string | null
    price_monthly: number
    price_annual: number
    max_members: number | null
    max_staff: number | null
    sort_order: number
    features: string[]
}

export type InvoiceRow = {
    id: string
    invoice_number: string
    status: string
    amount_due: number
    amount_paid: number
    issued_at: string
    paid_at: string | null
    planName: string | null
    billing_interval: string | null
    payment_method: string | null
    razorpay_payment_id: string | null
}

export type SubscriptionSettingsProps = {
    canManage: boolean
    state: string
    tone: Tone
    label: string
    headline: string
    detail: string
    requiresAction: boolean
    /** Subscription is expired, cancelled or paused - renewal is the primary action. */
    isLapsedState: boolean
    currentPlanId: string | null
    currentPlanName: string | null
    currentPlanSortOrder: number | null
    billingInterval: 'monthly' | 'annual'
    currentPrice: number
    currency: string
    effectiveUntil: string | null
    daysRemaining: number | null
    cancelAtPeriodEnd: boolean
    pendingPlanName: string | null
    pendingEffectiveAt: string | null
    usage: {
        members: number
        staff: number
        memberLimit: number | null
        staffLimit: number | null
        memberRatio: number | null
        staffRatio: number | null
    }
    plans: PlanOption[]
    invoices: InvoiceRow[]
    hasSubscription: boolean
}

/* ── helpers ───────────────────────────────────────────────────────────── */

const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
})

function money(value: number) {
    return inr.format(Math.round(value))
}

function formatDate(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── status banner ─────────────────────────────────────────────────────── */

const TONE_ICON: Record<Tone, typeof Info> = {
    ok: BadgeCheck,
    info: Info,
    warn: AlertTriangle,
    danger: AlertTriangle,
    idle: Info,
}

function StatusBanner({
    tone,
    headline,
    detail,
    isDark,
}: {
    tone: Tone
    headline: string
    detail: string
    isDark: boolean
}) {
    const Icon = TONE_ICON[tone]

    const palette: Record<Tone, string> = {
        ok: isDark
            ? 'border-[#10b981]/30 bg-[#10b981]/10 text-[#8df0c9]'
            : 'border-emerald-200 bg-emerald-50 text-emerald-900',
        info: isDark
            ? 'border-sky-500/25 bg-sky-500/10 text-sky-200'
            : 'border-sky-200 bg-sky-50 text-sky-900',
        warn: isDark
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            : 'border-amber-200 bg-amber-50 text-amber-900',
        danger: isDark
            ? 'border-red-500/30 bg-red-500/10 text-red-200'
            : 'border-red-200 bg-red-50 text-red-900',
        idle: isDark
            ? 'border-[#2a2a2a] bg-[#161616] text-zinc-300'
            : 'border-gray-200 bg-gray-50 text-gray-700',
    }

    return (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${palette[tone]}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                <p className="text-sm font-semibold">{headline}</p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-90">{detail}</p>
            </div>
        </div>
    )
}

/* ── usage meter ───────────────────────────────────────────────────────── */

function UsageMeter({
    label,
    used,
    limit,
    ratio,
    icon,
    isDark,
}: {
    label: string
    used: number
    limit: number | null
    ratio: number | null
    icon: React.ReactNode
    isDark: boolean
}) {
    // Colour only changes at thresholds that mean something: near the cap, and
    // at it. A gradient that shifts continuously reads as decoration.
    const nearLimit = ratio !== null && ratio >= 0.8
    const atLimit = ratio !== null && ratio >= 1

    const barColor = atLimit
        ? 'bg-red-500'
        : nearLimit
          ? 'bg-amber-500'
          : isDark
            ? 'bg-[#10b981]'
            : 'bg-blue-600'

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <span className={`flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {icon}
                    {label}
                </span>
                <span className={`font-mono text-xs tabular-nums ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    {used}
                    {limit === null ? (
                        <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}> / unlimited</span>
                    ) : (
                        <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}> / {limit}</span>
                    )}
                </span>
            </div>
            {limit === null ? (
                <p className={`mt-1.5 text-[11px] ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                    No cap on this plan.
                </p>
            ) : (
                <>
                    <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-200'}`}>
                        <div
                            className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
                            style={{ width: `${Math.max((ratio ?? 0) * 100, 2)}%` }}
                        />
                    </div>
                    {atLimit ? (
                        <p className="mt-1.5 text-[11px] font-medium text-red-500">
                            Limit reached. Upgrade to add more.
                        </p>
                    ) : nearLimit ? (
                        <p className="mt-1.5 text-[11px] font-medium text-amber-500">
                            {limit - used} left on this plan.
                        </p>
                    ) : null}
                </>
            )}
        </div>
    )
}

/* ── main ──────────────────────────────────────────────────────────────── */

export default function SubscriptionSettings(props: SubscriptionSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()

    const [interval, setInterval] = useState<'monthly' | 'annual'>(props.billingInterval)
    const [busyPlanId, setBusyPlanId] = useState<string | null>(null)
    const [showCancel, setShowCancel] = useState(false)
    const [pending, startTransition] = useTransition()

    const cardClass = `rounded-xl p-6 ${
        isDark
            ? 'border border-[#2a2a2a] bg-[#1c1c1c]'
            : 'border border-[#e7e9ee] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)]'
    }`

    const headingClass = `text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`
    const mutedClass = isDark ? 'text-zinc-400' : 'text-gray-500'

    async function handleChoosePlan(plan: PlanOption) {
        if (!props.canManage) return
        setBusyPlanId(plan.id)

        try {
            const result = await startPlanCheckout({ planId: plan.id, interval })

            if (!result.success) {
                toast.error(result.error)
                return
            }

            if ('scheduled' in result) {
                toast.success(result.message)
                router.refresh()
                return
            }

            // Reuses the same checkout plumbing as member payments; only the
            // description differs, because this is the gym paying GMS Cloud.
            const opened = await openRazorpayCheckout({
                order: {
                    amount: Math.round(result.amount * 100),
                    currency: result.currency,
                    invoiceNumber: result.invoiceNumber,
                    keyId: result.keyId,
                    orderId: result.orderId,
                    prefills: {
                        email: result.prefill.email,
                        name: result.prefill.name,
                        phone: result.prefill.contact,
                    },
                },
                gymName: 'GMS Cloud',
                planName: result.planName,
                description: `${result.planName} plan · billed ${interval === 'annual' ? 'annually' : 'monthly'}`,
                onSuccess: async (response) => {
                    const confirmed = await confirmPlanCheckout({
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                    })

                    if (confirmed.error) toast.error(confirmed.error)
                    else toast.success(confirmed.success ?? 'Payment received.')

                    router.refresh()
                },
                onDismiss: (reason) => {
                    toast.message(reason ?? 'Payment cancelled. Nothing was charged.')
                    // The webhook may still settle a payment that succeeded as
                    // the window closed, so refresh rather than assume nothing
                    // happened.
                    router.refresh()
                },
            })

            if (!opened) {
                toast.error('Could not load the payment window. Check your connection and try again.')
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not start the payment.')
        } finally {
            setBusyPlanId(null)
        }
    }

    function runAction(
        action: (prev: { error: string | null; success: string | null }, fd: FormData) => Promise<{ error: string | null; success: string | null }>,
        formData: FormData,
    ) {
        startTransition(async () => {
            const result = await action({ error: null, success: null }, formData)
            if (result.error) toast.error(result.error)
            else if (result.success) toast.success(result.success)
            router.refresh()
        })
    }

    const showRenew = props.isLapsedState || props.state === 'grace' || props.state === 'past_due'

    return (
        <div className="space-y-6">
            <div>
                <button
                    type="button"
                    onClick={() => router.push('/admin/settings')}
                    className={`mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                        isDark ? 'text-zinc-300 hover:bg-[#242424] hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Settings
                </button>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Billing &amp; Subscription
                </h1>
                <p className={`mt-0.5 text-sm ${mutedClass}`}>
                    Your GMS Cloud plan, usage, and payment history. This is separate from the membership
                    plans you sell to your own members.
                </p>
            </div>

            <StatusBanner
                tone={props.tone}
                headline={props.headline}
                detail={props.detail}
                isDark={isDark}
            />

            {!props.canManage ? (
                <div
                    className={`rounded-xl border px-4 py-3 text-xs ${
                        isDark ? 'border-[#2a2a2a] bg-[#161616] text-zinc-400' : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                >
                    You can view this page, but only an owner or admin can change the subscription.
                </div>
            ) : null}

            {/* ── current plan + usage ─────────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className={cardClass}>
                    <div className="mb-4 flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                            <CreditCard className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                        </div>
                        <h2 className={headingClass}>Current plan</h2>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {props.currentPlanName ?? 'No plan'}
                        </span>
                        {props.hasSubscription ? (
                            <span className={`font-mono text-sm tabular-nums ${mutedClass}`}>
                                {money(props.currentPrice)}
                                <span className="ml-1">
                                    / {props.billingInterval === 'annual' ? 'year' : 'month'}
                                </span>
                            </span>
                        ) : null}
                    </div>

                    <dl className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-4">
                            <dt className={mutedClass}>Status</dt>
                            <dd className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{props.label}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className={mutedClass}>
                                {props.state === 'trial' || props.state === 'trial_ending'
                                    ? 'Trial ends'
                                    : props.cancelAtPeriodEnd
                                      ? 'Ends on'
                                      : props.state === 'grace'
                                        ? 'Access until'
                                        : 'Renews on'}
                            </dt>
                            <dd className={`font-mono tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {formatDate(props.effectiveUntil)}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className={mutedClass}>Billing cycle</dt>
                            <dd className={`font-medium capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {props.billingInterval}
                            </dd>
                        </div>
                    </dl>

                    {props.pendingPlanName ? (
                        <div
                            className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
                                isDark ? 'border-amber-500/25 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'
                            }`}
                        >
                            <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                <p>
                                    Switching to <strong>{props.pendingPlanName}</strong> on{' '}
                                    {formatDate(props.pendingEffectiveAt)}.
                                </p>
                                {props.canManage ? (
                                    <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => runAction(cancelScheduledChange, new FormData())}
                                        className="mt-1 font-semibold underline underline-offset-2 disabled:opacity-50"
                                    >
                                        Keep my current plan instead
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {props.canManage && props.hasSubscription ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                            {props.cancelAtPeriodEnd ? (
                                <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => runAction(resumeSubscription, new FormData())}
                                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${
                                        isDark ? 'bg-[#10b981] text-black' : 'bg-blue-600 text-white'
                                    }`}
                                >
                                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                    Resume subscription
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowCancel((v) => !v)}
                                    className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                                        isDark
                                            ? 'border-[#2a2a2a] text-zinc-300 hover:bg-[#242424]'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Cancel subscription
                                </button>
                            )}
                        </div>
                    ) : null}

                    {showCancel && props.canManage && !props.cancelAtPeriodEnd ? (
                        <form
                            className="mt-4 space-y-3"
                            action={(fd) => {
                                runAction(cancelSubscription, fd)
                                setShowCancel(false)
                            }}
                        >
                            <p className={`text-xs leading-relaxed ${mutedClass}`}>
                                Your plan stays active until {formatDate(props.effectiveUntil)}. Nothing is
                                deleted, and you can resume any time before then.
                            </p>
                            <div className="space-y-1.5">
                                <label htmlFor="reason" className={`block text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                                    Why are you cancelling? <span className={mutedClass}>(optional)</span>
                                </label>
                                <input
                                    id="reason"
                                    name="reason"
                                    type="text"
                                    placeholder="Too expensive, missing a feature, closing the gym…"
                                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${
                                        isDark
                                            ? 'border-[#2a2a2a] bg-[#161616] text-white focus:border-[#10b981] focus:ring-[#10b981]/20'
                                            : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500/20'
                                    }`}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={pending}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                    Confirm cancellation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCancel(false)}
                                    className={`rounded-lg px-3.5 py-2 text-xs font-medium ${
                                        isDark ? 'text-zinc-300 hover:bg-[#242424]' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Keep it
                                </button>
                            </div>
                        </form>
                    ) : null}
                </div>

                <div className={cardClass}>
                    <div className="mb-4 flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                            <Users className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                        </div>
                        <h2 className={headingClass}>Usage</h2>
                    </div>

                    <div className="space-y-5">
                        <UsageMeter
                            label="Members"
                            used={props.usage.members}
                            limit={props.usage.memberLimit}
                            ratio={props.usage.memberRatio}
                            icon={<Users className="h-3.5 w-3.5" />}
                            isDark={isDark}
                        />
                        <UsageMeter
                            label="Staff accounts"
                            used={props.usage.staff}
                            limit={props.usage.staffLimit}
                            ratio={props.usage.staffRatio}
                            icon={<BadgeCheck className="h-3.5 w-3.5" />}
                            isDark={isDark}
                        />
                    </div>
                </div>
            </div>

            {/* ── plans ────────────────────────────────────────────────── */}
            {props.canManage ? (
                <div className={cardClass}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className={headingClass}>{showRenew ? 'Renew or change plan' : 'Change plan'}</h2>

                        <div
                            role="radiogroup"
                            aria-label="Billing cycle"
                            className={`inline-flex rounded-lg border p-0.5 ${isDark ? 'border-[#2a2a2a] bg-[#161616]' : 'border-gray-200 bg-gray-50'}`}
                        >
                            {(['monthly', 'annual'] as const).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    role="radio"
                                    aria-checked={interval === option}
                                    onClick={() => setInterval(option)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                                        interval === option
                                            ? isDark
                                                ? 'bg-[#2a2a2a] text-white'
                                                : 'bg-white text-gray-900 shadow-sm'
                                            : isDark
                                              ? 'text-zinc-400 hover:text-white'
                                              : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {props.plans.map((plan) => {
                            const isCurrent = plan.id === props.currentPlanId
                            const price = interval === 'annual' ? plan.price_annual : plan.price_monthly
                            const direction =
                                props.currentPlanSortOrder === null
                                    ? 'choose'
                                    : plan.sort_order > props.currentPlanSortOrder
                                      ? 'upgrade'
                                      : plan.sort_order < props.currentPlanSortOrder
                                        ? 'downgrade'
                                        : 'current'

                            const overMemberCap =
                                plan.max_members !== null && props.usage.members > plan.max_members
                            const overStaffCap = plan.max_staff !== null && props.usage.staff > plan.max_staff
                            const blocked = overMemberCap || overStaffCap

                            return (
                                <div
                                    key={plan.id}
                                    className={`flex flex-col rounded-xl border p-4 transition-colors ${
                                        isCurrent
                                            ? isDark
                                                ? 'border-[#10b981]/40 bg-[#10b981]/5'
                                                : 'border-blue-300 bg-blue-50/40'
                                            : isDark
                                              ? 'border-[#2a2a2a] bg-[#161616]'
                                              : 'border-gray-200 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {plan.name}
                                            </p>
                                            <p className={`mt-0.5 font-mono text-lg font-semibold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {money(price)}
                                                <span className={`ml-1 text-xs font-normal ${mutedClass}`}>
                                                    /{interval === 'annual' ? 'yr' : 'mo'}
                                                </span>
                                            </p>
                                        </div>
                                        {isCurrent ? (
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                    isDark ? 'bg-[#10b981]/20 text-[#8df0c9]' : 'bg-blue-100 text-blue-700'
                                                }`}
                                            >
                                                Current
                                            </span>
                                        ) : null}
                                    </div>

                                    {plan.description ? (
                                        <p className={`mt-2 text-xs leading-relaxed ${mutedClass}`}>{plan.description}</p>
                                    ) : null}

                                    <ul className="mt-3 space-y-1.5">
                                        <li className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>
                                            <Check className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden="true" />
                                            {plan.max_members === null ? 'Unlimited members' : `Up to ${plan.max_members} members`}
                                        </li>
                                        <li className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>
                                            <Check className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden="true" />
                                            {plan.max_staff === null ? 'Unlimited staff' : `Up to ${plan.max_staff} staff`}
                                        </li>
                                        {plan.features.map((feature) => (
                                            <li
                                                key={feature}
                                                className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}
                                            >
                                                <Check className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden="true" />
                                                {feature.replace(/_/g, ' ')}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-4 flex-1" />

                                    {blocked ? (
                                        <p className="text-[11px] font-medium text-amber-500">
                                            {overMemberCap
                                                ? `You have ${props.usage.members} members; this plan covers ${plan.max_members}.`
                                                : `You have ${props.usage.staff} staff; this plan covers ${plan.max_staff}.`}
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={busyPlanId !== null || (isCurrent && !showRenew)}
                                            onClick={() => handleChoosePlan(plan)}
                                            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
                                                direction === 'downgrade'
                                                    ? isDark
                                                        ? 'border border-[#2a2a2a] bg-transparent text-zinc-300'
                                                        : 'border border-gray-300 bg-white text-gray-700'
                                                    : isDark
                                                      ? 'bg-[#10b981] text-black'
                                                      : 'bg-blue-600 text-white'
                                            }`}
                                        >
                                            {busyPlanId === plan.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : null}
                                            {isCurrent
                                                ? showRenew
                                                    ? 'Renew this plan'
                                                    : 'Current plan'
                                                : direction === 'upgrade'
                                                  ? 'Upgrade'
                                                  : direction === 'downgrade'
                                                    ? 'Schedule downgrade'
                                                    : 'Choose plan'}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <p className={`mt-4 text-[11px] leading-relaxed ${mutedClass}`}>
                        Upgrades are charged now and apply immediately. Downgrades take effect when your
                        current period ends, so you keep what you have already paid for.
                    </p>
                </div>
            ) : null}

            {/* ── invoices ─────────────────────────────────────────────── */}
            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Receipt className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={headingClass}>Payment history</h2>
                </div>

                {props.invoices.length === 0 ? (
                    <p className={`py-6 text-center text-xs ${mutedClass}`}>
                        No GMS Cloud payments yet. Invoices appear here after your first subscription payment.
                    </p>
                ) : (
                    <div className="-mx-2 overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse">
                            <thead>
                                <tr className={`border-b text-left ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
                                    {['Invoice', 'Plan', 'Status', 'Amount', 'Date'].map((head, index) => (
                                        <th
                                            key={head}
                                            className={`px-2 py-2 text-[10px] font-semibold uppercase tracking-wider ${mutedClass} ${
                                                index >= 3 ? 'text-right' : ''
                                            }`}
                                        >
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {props.invoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className={`border-b last:border-b-0 ${isDark ? 'border-[#222]' : 'border-gray-100'}`}
                                    >
                                        <td className={`px-2 py-2.5 font-mono text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {invoice.invoice_number}
                                        </td>
                                        <td className={`px-2 py-2.5 text-xs ${mutedClass}`}>
                                            {invoice.planName ?? '—'}
                                            {invoice.billing_interval ? (
                                                <span className="ml-1 opacity-70">({invoice.billing_interval})</span>
                                            ) : null}
                                        </td>
                                        <td className="px-2 py-2.5">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                                    invoice.status === 'paid'
                                                        ? isDark
                                                            ? 'bg-emerald-500/15 text-emerald-300'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                        : invoice.status === 'failed'
                                                          ? isDark
                                                              ? 'bg-red-500/15 text-red-300'
                                                              : 'bg-red-100 text-red-700'
                                                          : isDark
                                                            ? 'bg-zinc-700/40 text-zinc-300'
                                                            : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className={`px-2 py-2.5 text-right font-mono text-xs tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {money(invoice.status === 'paid' ? invoice.amount_paid : invoice.amount_due)}
                                        </td>
                                        <td className={`px-2 py-2.5 text-right font-mono text-xs tabular-nums ${mutedClass}`}>
                                            {formatDate(invoice.paid_at ?? invoice.issued_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className={`mt-4 text-[11px] leading-relaxed ${mutedClass}`}>
                    GMS Cloud subscriptions are paid per cycle through Razorpay. No card is stored on your
                    account, so there is no saved payment method to manage — you approve each renewal.
                </p>
            </div>
        </div>
    )
}

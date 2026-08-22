'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    IconAlertTriangle,
    IconCheck,
    IconClock,
    IconCoin,
    IconDownload,
    IconLoader2,
    IconReceiptOff,
    IconRotateClockwise,
    IconX,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/currency'
import {
    Bezel,
    Button,
    Card,
    EmptyState,
    LinkButton,
    Pill,
    Row,
    RowGroup,
    Screen,
    SectionHeading,
    Stack,
} from '@/components/member/ui'
import { verificationStorageKey } from '@/lib/payments/razorpay-checkout'
import {
    displayReceiptNumber,
    downloadReceiptPdf,
    formatPaymentMethod,
    formatReceiptDate,
    hasAdmissionFee,
    planOnlyAmount,
    receiptFooterMessage,
    receiptFooterNote,
    statusLabel,
    type PaymentReceipt,
} from '@/lib/payments/receipt'
import { markRazorpayPaymentFailed, verifyRazorpayPayment } from '@/app/member/plans/actions'

/*
  Payment outcome, in the portal's own material.

  Three screens behind one route, chosen by `status`:

  - processing : the gateway took the money, the signature is still unverified.
  - success    : a receipt exists, so the amount leads and the paperwork follows.
  - failure    : nothing was taken; the only thing that matters is the way back.

  The amount is the headline on a receipt, not the word "success", so the hero
  states the figure and lets the disc and the pill carry status. Everything
  below it is reference material and is ranked accordingly: what you bought,
  then who it was for, then the gateway IDs almost nobody reads.
*/

type Outcome = PaymentReceipt['paymentStatus']

const DISC_CLASS: Record<Outcome, string> = {
    paid: 'bg-[var(--m-accent)] text-[var(--m-accent-ink)]',
    pending: 'bg-[var(--m-warn-wash)] text-[var(--m-warn-ink)]',
    failed: 'bg-[var(--m-danger-wash)] text-[var(--m-danger)]',
    refunded: 'bg-[var(--m-surface-2)] text-[var(--m-ink-2)]',
}

const PILL_TONE: Record<Outcome, 'accent' | 'warn' | 'danger' | 'neutral'> = {
    paid: 'accent',
    pending: 'warn',
    failed: 'danger',
    refunded: 'neutral',
}

const OUTCOME_NOTE: Record<Outcome, string> = {
    paid: 'Your membership is updated. Keep the receipt for your records.',
    pending: 'The gateway has not settled this payment yet. It will update on its own.',
    failed: 'Nothing was charged. You can start the renewal again whenever you are ready.',
    refunded: 'This payment was returned to your original payment method.',
}

function OutcomeIcon({ outcome }: { outcome: Outcome }) {
    if (outcome === 'paid') return <IconCheck size={30} stroke={2.4} />
    if (outcome === 'pending') return <IconClock size={28} stroke={1.8} />
    if (outcome === 'refunded') return <IconRotateClockwise size={28} stroke={1.8} />
    return <IconX size={28} stroke={2.2} />
}

/** One line of the price breakdown. Amounts share a column so they scan down. */
function AmountRow({
    label,
    hint,
    value,
    tone,
}: {
    label: string
    hint?: string
    value: string
    tone?: 'accent'
}) {
    return (
        <div className="flex items-start justify-between gap-4 px-4 py-3.5">
            <div className="min-w-0">
                <p
                    className={cn(
                        'flex items-center gap-1.5 text-[14px] font-medium',
                        tone === 'accent' && 'text-[var(--m-accent-wash-ink)]',
                    )}
                >
                    {tone === 'accent' ? <IconCoin size={15} stroke={1.8} /> : null}
                    {label}
                </p>
                {hint ? (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--m-ink-3)]">{hint}</p>
                ) : null}
            </div>
            <p
                className={cn(
                    'm-num shrink-0 text-[14px] font-semibold',
                    tone === 'accent' && 'text-[var(--m-accent-wash-ink)]',
                )}
            >
                {value}
            </p>
        </div>
    )
}

/** Gateway IDs: long, monospaced, and allowed to wrap rather than truncate. */
function ReferenceField({ label, value }: { label: string; value: string | null }) {
    return (
        <div>
            <p className="text-[12px] font-medium text-[var(--m-ink-3)]">{label}</p>
            <p className="m-num mt-1 break-all text-[12.5px] font-medium text-[var(--m-ink-2)]">
                {value || '-'}
            </p>
        </div>
    )
}

export default function ResultClient({
    invoiceNumber,
    payment,
    reason,
    status,
}: {
    invoiceNumber: string | null
    payment: PaymentReceipt | null
    reason: string | null
    status: 'success' | 'failure' | 'processing'
}) {
    const router = useRouter()
    const [downloading, setDownloading] = useState(false)
    const [processingError, setProcessingError] = useState<string | null>(null)

    /*
      Finishes the checkout the renew screen started: it parked the signed
      Razorpay response in sessionStorage and routed here, because verification
      has to happen server-side and should survive the navigation away from the
      gateway's window.
    */
    useEffect(() => {
        if (status !== 'processing' || !invoiceNumber) return

        let cancelled = false
        const invoice = invoiceNumber
        const key = verificationStorageKey(invoice)

        async function finalize() {
            const stored = sessionStorage.getItem(key)

            if (!stored) {
                if (!cancelled) {
                    setProcessingError(
                        'We could not pick up the confirmation for this payment. Check your payment history in a moment.',
                    )
                }
                return
            }

            let payload: unknown
            try {
                payload = JSON.parse(stored)
            } catch {
                sessionStorage.removeItem(key)
                if (!cancelled) {
                    setProcessingError(
                        'The saved confirmation details were unreadable. Check your payment history in a moment.',
                    )
                }
                return
            }

            const verification = payload as {
                planId: string
                razorpayOrderId: string
                razorpayPaymentId: string
                razorpaySignature: string
                useReferralCoins: boolean
            }

            const result = await verifyRazorpayPayment(verification)
            sessionStorage.removeItem(key)

            if (cancelled) return

            if ('error' in result) {
                await markRazorpayPaymentFailed({
                    razorpayOrderId: verification.razorpayOrderId,
                    reason: result.error,
                })
                router.replace(
                    `/member/payments/result?status=failure&invoice=${encodeURIComponent(invoice)}&reason=${encodeURIComponent(result.error)}`,
                )
                return
            }

            router.replace(
                `/member/payments/result?status=success&invoice=${encodeURIComponent(result.invoiceNumber)}`,
            )
        }

        void finalize()

        return () => {
            cancelled = true
        }
    }, [invoiceNumber, router, status])

    /* ------------------------------------------------------------ processing */

    if (status === 'processing') {
        return (
            <Screen title="Confirming payment">
                <Stack gap={14}>
                    <Bezel className="m-rise">
                        <div className="flex flex-col items-center px-6 py-10 text-center">
                            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                                <IconLoader2 size={28} stroke={2} className="animate-spin" />
                            </span>
                            <p className="text-[17px] font-semibold tracking-[-0.015em]">
                                Verifying with Razorpay
                            </p>
                            <p className="mt-2 max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                                Your payment went through. We are checking it against the gateway and
                                extending your membership.
                            </p>
                            {invoiceNumber ? (
                                <p className="m-num mt-4 text-[12px] text-[var(--m-ink-3)]">
                                    {invoiceNumber}
                                </p>
                            ) : null}
                        </div>
                    </Bezel>

                    {processingError ? (
                        <Card className="flex items-start gap-3 border-transparent bg-[var(--m-danger-wash)] p-4">
                            <IconAlertTriangle
                                size={18}
                                stroke={1.8}
                                className="mt-0.5 shrink-0 text-[var(--m-danger)]"
                            />
                            <div className="min-w-0">
                                <p className="text-[13.5px] leading-relaxed text-[var(--m-danger)]">
                                    {processingError}
                                </p>
                                <div className="mt-3">
                                    <LinkButton href="/member/payments" tone="quiet" size="sm">
                                        Payment history
                                    </LinkButton>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card className="flex items-start gap-3 border-transparent bg-[var(--m-warn-wash)] p-4">
                            <IconAlertTriangle
                                size={18}
                                stroke={1.8}
                                className="mt-0.5 shrink-0 text-[var(--m-warn-ink)]"
                            />
                            <p className="text-[13.5px] leading-relaxed text-[var(--m-warn-ink)]">
                                Keep this screen open until it finishes. Closing or refreshing now can
                                delay your receipt.
                            </p>
                        </Card>
                    )}
                </Stack>
            </Screen>
        )
    }

    /* -------------------------------------------------------- nothing to show */

    if (!payment) {
        return (
            <Screen title="Payment">
                <Stack gap={14}>
                    <EmptyState
                        icon={<IconReceiptOff size={26} stroke={1.6} />}
                        title={status === 'failure' ? 'Payment not completed' : 'Receipt not found'}
                        body={
                            reason ??
                            (status === 'failure'
                                ? 'Nothing was charged. You can start the renewal again whenever you are ready.'
                                : 'We could not find a receipt for this reference. It may still be on its way.')
                        }
                        action={
                            <div className="flex flex-col gap-2.5 sm:flex-row">
                                <LinkButton href="/member/membership/renew" full>
                                    Try again
                                </LinkButton>
                                <LinkButton href="/member/payments" tone="quiet" full>
                                    Payment history
                                </LinkButton>
                            </div>
                        }
                    />
                </Stack>
            </Screen>
        )
    }

    /* ------------------------------------------------------------- receipt */

    const outcome: Outcome = payment.paymentStatus
    const period =
        payment.membershipStartDate && payment.membershipEndDate
            ? `${formatReceiptDate(payment.membershipStartDate)} to ${formatReceiptDate(payment.membershipEndDate)}`
            : null

    const handleDownload = async () => {
        setDownloading(true)
        try {
            await downloadReceiptPdf(payment)
        } finally {
            setDownloading(false)
        }
    }

    return (
        <Screen title="Payment receipt">
            <Stack gap={14}>
                {/* Hero. The figure leads; the disc and pill carry the status. */}
                <Bezel className="m-rise">
                    <div className="flex flex-col items-center px-6 py-8 text-center">
                        <span
                            className={cn(
                                'mb-5 flex h-16 w-16 items-center justify-center rounded-[20px]',
                                DISC_CLASS[outcome],
                            )}
                        >
                            <OutcomeIcon outcome={outcome} />
                        </span>

                        <p className="m-num text-[38px] font-semibold leading-none tracking-[-0.02em]">
                            {formatCurrency(payment.amount)}
                        </p>

                        <p className="mt-3 text-[14px] font-medium">{payment.planName}</p>
                        {period ? (
                            <p className="mt-1 text-[12.5px] text-[var(--m-ink-3)]">{period}</p>
                        ) : null}

                        <div className="mt-4">
                            <Pill tone={PILL_TONE[outcome]}>{statusLabel(outcome)}</Pill>
                        </div>

                        <p className="mt-4 max-w-[34ch] text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                            {reason && outcome === 'failed' ? reason : OUTCOME_NOTE[outcome]}
                        </p>
                    </div>
                </Bezel>

                {/* Actions sit directly under the outcome, before the paperwork. */}
                <div className="flex flex-col gap-2.5 sm:flex-row">
                    <Button
                        onClick={handleDownload}
                        disabled={downloading}
                        aria-busy={downloading}
                        full
                        leadingIcon={
                            downloading ? (
                                <IconLoader2 size={17} stroke={2} className="animate-spin" />
                            ) : (
                                <IconDownload size={17} stroke={1.8} />
                            )
                        }
                    >
                        {downloading ? 'Preparing' : 'Download receipt'}
                    </Button>
                    <LinkButton href="/member/payments" tone="quiet" full>
                        Payment history
                    </LinkButton>
                </div>

                {outcome === 'failed' ? (
                    <LinkButton href="/member/membership/renew" tone="quiet" full>
                        Start the renewal again
                    </LinkButton>
                ) : null}

                {/* What was bought. */}
                <SectionHeading>Breakdown</SectionHeading>
                <Card className="m-divide overflow-hidden py-0">
                    <AmountRow
                        label={payment.planName}
                        hint={period ?? undefined}
                        value={formatCurrency(planOnlyAmount(payment))}
                    />
                    {hasAdmissionFee(payment) ? (
                        <AmountRow
                            label="Admission fee"
                            value={formatCurrency(payment.admissionFeeAmount as number)}
                        />
                    ) : null}
                    {payment.coinsUsed > 0 ? (
                        <AmountRow
                            label="Referral credits"
                            hint={`${payment.coinsUsed} credits applied`}
                            value={`- ${formatCurrency(payment.coinsUsed)}`}
                            tone="accent"
                        />
                    ) : null}
                    <div className="flex items-center justify-between gap-4 bg-[var(--m-surface-2)] px-4 py-4">
                        <p className="text-[14px] font-semibold">Total paid</p>
                        <p className="m-num text-[19px] font-semibold tracking-[-0.02em]">
                            {formatCurrency(payment.amount)}
                        </p>
                    </div>
                </Card>

                {/* Who and when. */}
                <SectionHeading>Details</SectionHeading>
                <RowGroup>
                    <Row
                        label="Receipt number"
                        value={<span className="m-num">{displayReceiptNumber(payment)}</span>}
                    />
                    <Row label="Paid on" value={formatReceiptDate(payment.paymentDate)} />
                    <Row label="Method" value={formatPaymentMethod(payment.paymentMethod)} />
                    <Row label="Member" value={payment.memberFullName} />
                    <Row
                        label="Member ID"
                        value={<span className="m-num">{payment.memberDisplayId}</span>}
                    />
                </RowGroup>

                {/* Gateway reference, last because it is the least read. */}
                {payment.razorpayOrderId || payment.razorpayPaymentId ? (
                    <>
                        <SectionHeading>Reference</SectionHeading>
                        <Card className="flex flex-col gap-4 p-4">
                            <ReferenceField label="Razorpay order ID" value={payment.razorpayOrderId} />
                            <ReferenceField
                                label="Razorpay payment ID"
                                value={payment.razorpayPaymentId}
                            />
                        </Card>
                    </>
                ) : null}

                <div className="px-2 pb-2 pt-1 text-center">
                    <p className="text-[13px] font-medium text-[var(--m-ink-2)]">
                        {receiptFooterMessage(payment)}
                    </p>
                    <p className="mx-auto mt-1.5 max-w-[40ch] text-[12px] leading-relaxed text-[var(--m-ink-3)]">
                        {receiptFooterNote(payment)}
                    </p>
                </div>
            </Stack>
        </Screen>
    )
}

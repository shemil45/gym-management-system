'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    CheckCircle2,
    Coins,
    Download,
    Loader2,
    XCircle,
} from 'lucide-react'
import { markRazorpayPaymentFailed, verifyRazorpayPayment } from '../member/plans/actions'
import {
    displayReceiptNumber,
    downloadReceiptPdf,
    formatGymAddressLine,
    formatPaymentMethod,
    formatReceiptDate as formatDate,
    planOnlyAmount as planOnlyAmountOf,
    statusLabel,
    type PaymentReceipt as PaymentResult,
} from '@/lib/payments/receipt'

type ResultClientProps = {
    invoiceNumber?: string
    payment?: PaymentResult | null
    portal: 'admin' | 'member'
    reason?: string
    status: 'success' | 'failure' | 'processing'
}

type StoredVerificationPayload = {
    planId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
    useReferralCoins: boolean
}

const getVerificationStorageKey = (invoiceNumber: string) => `razorpay-result:${invoiceNumber}`

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export default function ResultClient({ invoiceNumber, payment, portal, reason, status }: ResultClientProps) {
    const router = useRouter()
    const [downloading, setDownloading] = useState(false)
    const [processingError, setProcessingError] = useState<string | null>(null)
    const processingInvoiceNumber = invoiceNumber ?? null
    const historyHref = portal === 'admin' ? '/admin/finances/payments' : '/member/payments'
    const fallbackHref = portal === 'admin' ? '/admin/finances/payments' : '/member/membership'
    const hasDiscount = payment && payment.coinsUsed > 0
    const planOnlyAmount = payment ? planOnlyAmountOf(payment) : 0
    const resolvedStatus = payment?.paymentStatus ?? (status === 'failure' ? 'failed' : 'paid')
    const bannerTone =
        resolvedStatus === 'paid'
            ? 'success'
            : resolvedStatus === 'pending'
                ? 'warning'
                : resolvedStatus === 'refunded'
                    ? 'info'
                    : 'failure'

    const bannerStyles = {
        success: 'border-emerald-200 bg-emerald-50/80',
        warning: 'border-amber-200 bg-amber-50/80',
        info: 'border-sky-200 bg-sky-50/80',
        failure: 'border-rose-200 bg-rose-50/80',
    } as const

    const badgeStyles = {
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        info: 'bg-sky-500',
        failure: 'bg-rose-500',
    } as const

    const statusCopy = {
        paid: {
            title: 'Payment successful',
            message: 'Your receipt is ready. Download or view it below.',
        },
        pending: {
            title: 'Payment pending',
            message: 'This payment is still being processed. You can still open the receipt details below.',
        },
        refunded: {
            title: 'Payment refunded',
            message: 'This payment has been refunded. You can still view or download the receipt below.',
        },
        failed: {
            title: 'Payment not completed',
            message: reason || 'We could not confirm your payment. Please try again.',
        },
    } as const

    useEffect(() => {
            if (status !== 'processing' || !processingInvoiceNumber) {
            return
        }

        let cancelled = false
        const invoice = processingInvoiceNumber

        async function finalizePayment() {
            const storedPayload = sessionStorage.getItem(getVerificationStorageKey(invoice))

            if (!storedPayload) {
                if (!cancelled) {
                    setProcessingError('We could not resume the Razorpay confirmation. Please check your payment history.')
                }
                return
            }

            let payload: StoredVerificationPayload

            try {
                payload = JSON.parse(storedPayload) as StoredVerificationPayload
            } catch {
                sessionStorage.removeItem(getVerificationStorageKey(invoice))
                if (!cancelled) {
                    setProcessingError('The saved payment confirmation details were invalid. Please check your payment history.')
                }
                return
            }

            const verifyResult = await verifyRazorpayPayment(payload)
            sessionStorage.removeItem(getVerificationStorageKey(invoice))

            if (cancelled) {
                return
            }

            if ('error' in verifyResult) {
                await markRazorpayPaymentFailed({
                    razorpayOrderId: payload.razorpayOrderId,
                    reason: verifyResult.error,
                })
                router.replace(`/invoice?status=failure&portal=${portal}&invoice=${encodeURIComponent(invoice)}&reason=${encodeURIComponent(verifyResult.error)}`)
                return
            }

            router.replace(`/invoice?status=success&portal=${portal}&invoice=${encodeURIComponent(verifyResult.invoiceNumber)}`)
        }

        void finalizePayment()

        return () => {
            cancelled = true
        }
    }, [portal, processingInvoiceNumber, router, status])

    const handleDownload = async () => {
        if (!payment) return
        setDownloading(true)
        try {
            await downloadReceiptPdf(payment)
        } finally {
            setDownloading(false)
        }
    }

    if (status === 'processing') {
        return (
            <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-slate-950">Confirming your payment</h2>
                            <p className="text-sm text-slate-500">
                                Your payment was received by Razorpay. We&apos;re generating the receipt and updating your membership now.
                            </p>
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                Please do not refresh, close this page, or go back until the payment confirmation is complete.
                            </div>
                            {processingError ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    {processingError}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400">
                                    Receipt: {processingInvoiceNumber}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            {/* ── Status Banner ── */}
            <div className={`rounded-2xl border p-4 shadow-sm ${bannerStyles[bannerTone]}`}>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${badgeStyles[bannerTone]}`}>
                            {resolvedStatus === 'paid' ? <CheckCircle2 className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-gray-950 sm:text-lg">
                                {statusCopy[resolvedStatus].title}
                            </h1>
                            <p className="text-xs text-gray-500 sm:text-sm">
                                {statusCopy[resolvedStatus].message}
                            </p>
                        </div>
                    </div>

                    {/* Action buttons — full-width on mobile, auto on sm+ */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {payment && (
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 sm:w-auto sm:justify-start"
                            >
                                <Download className="h-4 w-4" />
                                {downloading ? 'Preparing...' : 'Download PDF'}
                            </button>
                        )}
                        <Link
                            href={historyHref}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto sm:justify-start"
                        >
                            Payment history
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Receipt Card ── */}
            {payment && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* ── Header band ─────────────────────────────── */}
                    <div className="bg-[#0f172a] px-5 py-5 sm:px-6">
                        {/* Mobile: stacked. Desktop: side-by-side */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            {/* Branding */}
                            <div className="flex items-start gap-3">
                                {payment.gym.showLogo && payment.gym.logoUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={payment.gym.logoUrl}
                                        alt={payment.gym.name}
                                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                                    />
                                )}
                                <div>
                                    <p className="text-base font-bold text-white">{payment.gym.name || 'Gym'}</p>
                                    {payment.gym.showAddress && formatGymAddressLine(payment.gym) && (
                                        <p className="mt-1 text-xs text-slate-400">{formatGymAddressLine(payment.gym)}</p>
                                    )}
                                    {payment.gym.showEmail && payment.gym.contactEmail && (
                                        <p className="text-xs text-slate-400">{payment.gym.contactEmail}</p>
                                    )}
                                    {payment.gym.showPhone && payment.gym.contactPhone && (
                                        <p className="text-xs text-slate-400">{payment.gym.contactPhone}</p>
                                    )}
                                    {payment.gym.showGstin && payment.gym.gstin && (
                                        <p className="text-xs text-slate-400">GSTIN: {payment.gym.gstin}</p>
                                    )}
                                </div>
                            </div>
                            {/* Receipt meta — left on mobile, right on desktop */}
                            <div className="sm:text-right">
                                <p className="text-base font-bold text-white">RECEIPT</p>
                                <p className="mt-0.5 font-mono text-xs text-emerald-400">{displayReceiptNumber(payment)}</p>
                                <p className="text-xs text-slate-400">{formatDate(payment.paymentDate)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 p-4 sm:p-6">

                        {/* ── Status badge ────────────────────────── */}
                        <div>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                                payment.paymentStatus === 'paid' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                            }`}>
                                {statusLabel(payment.paymentStatus).toUpperCase()}
                            </span>
                        </div>

                        {/* ── Info fields — stacked on mobile, row on sm ── */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:gap-10">
                            <div>
                                <p className="text-xs text-slate-500">Payment Date</p>
                                <p className="mt-0.5 font-semibold text-slate-900">{formatDate(payment.paymentDate)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Payment Method</p>
                                <p className="mt-0.5 font-semibold text-slate-900">{formatPaymentMethod(payment.paymentMethod)}</p>
                            </div>
                        </div>

                        {/* ── Member information ────────────────────── */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:gap-10">
                            <div>
                                <p className="text-xs text-slate-500">Member</p>
                                <p className="mt-0.5 font-semibold text-slate-900">{payment.memberFullName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Member ID</p>
                                <p className="mt-0.5 font-semibold text-slate-900">{payment.memberDisplayId}</p>
                            </div>
                        </div>

                        {/* ── Line-items table ─────────────────────── */}
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <div className="sm:hidden">
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center bg-[#0f172a] px-4 py-3 text-white">
                                    <span className="text-left text-xs font-semibold">Plan Name</span>
                                    <span className="text-right text-xs font-semibold">Amount</span>
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-4 text-sm">
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-900">{payment.planName}</p>
                                        <p className="mt-0.5 text-xs text-slate-500">Membership Period</p>
                                        <p className="text-xs leading-5 text-slate-500">
                                            {formatDate(payment.membershipStartDate)} to {formatDate(payment.membershipEndDate)}
                                        </p>
                                    </div>
                                    <div className="justify-self-end whitespace-nowrap text-right font-semibold text-slate-900">
                                        {formatCurrency(planOnlyAmount)}
                                    </div>
                                </div>
                                {payment.admissionFeeAmount !== null && payment.admissionFeeAmount > 0 && (
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-slate-100 px-4 py-3">
                                        <span className="text-sm text-slate-700">Admission Fee</span>
                                        <span className="justify-self-end whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                                            {formatCurrency(payment.admissionFeeAmount)}
                                        </span>
                                    </div>
                                )}
                                {hasDiscount && (
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-emerald-100 bg-emerald-50/60 px-4 py-3">
                                        <div className="min-w-0 text-emerald-700">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Coins className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                                <span className="text-sm font-medium">Referral Coins Discount</span>
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                    {payment.coinsUsed} coins
                                                </span>
                                            </div>
                                        </div>
                                        <div className="justify-self-end whitespace-nowrap text-right text-sm font-semibold text-emerald-700">
                                            -{formatCurrency(payment.coinsUsed)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <table className="hidden w-full text-sm sm:table">
                                <thead>
                                    <tr className="bg-[#0f172a] text-white">
                                        <th className="w-[68%] px-4 py-3 text-left text-xs font-semibold sm:w-auto">Plan Name</th>
                                        {/* Hidden on mobile — shown as sub-text in cell instead */}
                                        <th className="hidden px-4 py-3 text-left text-xs font-semibold sm:table-cell">Membership Period</th>
                                        <th className="w-24 pl-4 pr-5 py-3 text-right text-xs font-semibold sm:w-auto">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* ── Plan row ── */}
                                    <tr>
                                        <td className="w-[68%] px-4 py-3.5 align-top sm:w-auto">
                                            <p className="font-medium text-slate-900">{payment.planName}</p>
                                            {/* Membership period shown inline on mobile */}
                                            <p className="mt-0.5 text-xs text-slate-500 sm:hidden">
                                                <span className="font-medium text-slate-400">Membership Period</span><br />
                                                {formatDate(payment.membershipStartDate)} to {formatDate(payment.membershipEndDate)}
                                            </p>
                                        </td>
                                        {/* Period col — desktop only */}
                                        <td className="hidden px-4 py-3.5 text-slate-600 sm:table-cell">
                                            {formatDate(payment.membershipStartDate)} to {formatDate(payment.membershipEndDate)}
                                        </td>
                                        <td className="w-24 pl-4 pr-5 py-3.5 text-right align-top font-semibold text-slate-900 sm:w-auto">
                                            {formatCurrency(planOnlyAmount)}
                                        </td>
                                    </tr>
                                    {/* ── Admission fee row ── */}
                                    {payment.admissionFeeAmount !== null && payment.admissionFeeAmount > 0 && (
                                        <tr>
                                            <td className="px-4 py-3 text-sm text-slate-700" colSpan={2}>Admission Fee</td>
                                            <td className="w-24 pl-4 pr-5 py-3 text-right text-sm font-semibold text-slate-900 sm:w-auto">
                                                {formatCurrency(payment.admissionFeeAmount)}
                                            </td>
                                        </tr>
                                    )}
                                    {/* ── Coins discount row ── */}
                                    {hasDiscount && (
                                        <tr className="bg-emerald-50/60">
                                            <td className="px-4 py-3 text-emerald-700 sm:col-span-1" colSpan={2}>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Coins className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                                    <span className="text-sm font-medium">Referral Coins Discount</span>
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                        {payment.coinsUsed} coins
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="w-24 pl-4 pr-5 py-3 text-right text-sm font-semibold text-emerald-700 sm:w-auto">
                                                -{formatCurrency(payment.coinsUsed)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Total — full-width on mobile, right-aligned on sm ── */}
                        <div className="sm:flex sm:justify-end">
                            <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 sm:w-56">
                                <p className="text-xs font-medium text-emerald-700">Total Paid</p>
                                <p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(payment.amount)}</p>
                            </div>
                        </div>

                        {/* ── Payment Reference ─────────────────────── */}
                        <div>
                            <div className="mb-3 border-t border-slate-100" />
                            <p className="mb-3 text-sm font-semibold text-slate-900">Payment Reference</p>
                            {/* Stack on mobile, 2-col on sm+ */}
                            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-medium text-emerald-600">Razorpay Order ID</p>
                                    <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-800">{payment.razorpayOrderId || '-'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-medium text-emerald-600">Razorpay Payment ID</p>
                                    <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-800">{payment.razorpayPaymentId || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Footer note ──────────────────────────── */}
                        <div className="border-t border-slate-100 pt-4 text-center">
                            <p className="text-sm font-semibold text-slate-800">
                                {payment.gym.footerMessage || `Thank you for training with ${payment.gym.name || 'us'}!`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {payment.gym.additionalNotes || 'This is a system generated receipt and does not require a physical signature.'}
                            </p>
                        </div>

                    </div>
                </div>
            )}

            {!payment && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={fallbackHref}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            {portal === 'admin' ? 'Back to payments' : 'Return to plans'}
                        </Link>
                        <Link
                            href={historyHref}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Open payment history
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

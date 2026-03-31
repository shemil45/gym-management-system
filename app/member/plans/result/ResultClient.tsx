'use client'

import { useState } from 'react'
import Link from 'next/link'
import { jsPDF } from 'jspdf'
import {
    CheckCircle2,
    Coins,
    Download,
    XCircle,
} from 'lucide-react'

type PaymentResult = {
    amount: number
    coinsUsed: number
    invoiceNumber: string
    membershipEndDate: string | null
    membershipStartDate: string | null
    originalPrice: number
    paymentDate: string
    paymentMethod: string
    paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded'
    planName: string
    razorpayOrderId: string | null
    razorpayPaymentId: string | null
}

type ResultClientProps = {
    invoiceNumber?: string
    payment?: PaymentResult | null
    reason?: string
    status: 'success' | 'failure'
}

function formatDate(value: string | null) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

// jsPDF's built-in Helvetica cannot render ₹ — use ASCII-safe prefix
function formatPdfCurrency(amount: number) {
    return `Rs. ${amount.toLocaleString('en-IN')}`
}

function formatPaymentMethod(method: string) {
    return method
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function statusLabel(status: PaymentResult['paymentStatus']) {
    return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function ResultClient({ payment, reason, status }: ResultClientProps) {
    const [downloading, setDownloading] = useState(false)
    const hasDiscount = payment && payment.coinsUsed > 0
    const resolvedStatus = payment?.paymentStatus ?? (status === 'success' ? 'paid' : 'failed')
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
            message: 'Your invoice is ready. Download or view it below.',
        },
        pending: {
            title: 'Payment pending',
            message: 'This payment is still being processed. You can still open the invoice details below.',
        },
        refunded: {
            title: 'Payment refunded',
            message: 'This payment has been refunded. You can still view or download the invoice below.',
        },
        failed: {
            title: 'Payment not completed',
            message: reason || 'We could not confirm your payment. Please try again.',
        },
    } as const

    const handleDownload = async () => {
        if (!payment) return
        setDownloading(true)
        try {
            const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
            const pageW = 210
            const mL = 16   // left margin
            const mR = 16   // right margin
            const bodyW = pageW - mL - mR

            /* ── HEADER ────────────────────────────────────────────── */
            pdf.setFillColor(15, 23, 42)            // #0f172a  slate-900
            pdf.rect(0, 0, pageW, 48, 'F')

            // Left column – branding
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'bold')
            pdf.text('GYM PRO FITNESS', mL, 18)

            pdf.setFontSize(8.5)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(148, 163, 184)         // slate-400
            pdf.text('support@gympro.com', mL, 27)
            pdf.text('+91 98765 43210', mL, 34)

            // Right column – invoice meta
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(16)
            pdf.setFont('helvetica', 'bold')
            pdf.text('INVOICE', pageW - mR, 18, { align: 'right' })

            pdf.setFontSize(8.5)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(16, 185, 129)          // emerald-500
            pdf.text(payment.invoiceNumber, pageW - mR, 27, { align: 'right' })
            pdf.setTextColor(148, 163, 184)
            pdf.text(formatDate(payment.paymentDate), pageW - mR, 34, { align: 'right' })

            /* ── STATUS BADGE ──────────────────────────────────────── */
            const isPaid = payment.paymentStatus === 'paid'
            pdf.setFillColor(isPaid ? 16 : 239, isPaid ? 185 : 68, isPaid ? 129 : 68)
            pdf.roundedRect(mL, 55, 22, 7, 2, 2, 'F')
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(7.5)
            pdf.setFont('helvetica', 'bold')
            pdf.text(statusLabel(payment.paymentStatus).toUpperCase(), mL + 11, 60.2, { align: 'center' })

            /* ── INFO ROW ──────────────────────────────────────────── */
            let y = 68
            pdf.setFontSize(7.5)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(100, 116, 139)         // slate-500
            pdf.text('Payment Date', mL, y)
            pdf.text('Payment Method', 100, y)

            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(15, 23, 42)
            pdf.text(formatDate(payment.paymentDate), mL, y + 7)
            pdf.text(formatPaymentMethod(payment.paymentMethod), 100, y + 7)

            /* ── TABLE ─────────────────────────────────────────────── */
            y += 20
            // Header row
            pdf.setFillColor(15, 23, 42)
            pdf.rect(mL, y, bodyW, 10, 'F')
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(8.5)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Plan Name', mL + 4, y + 7)
            pdf.text('Membership Period', 85, y + 7)
            pdf.text('Amount', pageW - mR - 4, y + 7, { align: 'right' })

            // Plan row
            y += 10
            pdf.setFillColor(255, 255, 255)
            pdf.setDrawColor(226, 232, 240)
            pdf.rect(mL, y, bodyW, 14, 'F')
            pdf.rect(mL, y, bodyW, 14)
            pdf.setTextColor(15, 23, 42)
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'bold')
            pdf.text(payment.planName, mL + 4, y + 9)
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(8.5)
            pdf.setTextColor(71, 85, 105)
            pdf.text(
                `${formatDate(payment.membershipStartDate)}  to  ${formatDate(payment.membershipEndDate)}`,
                85, y + 9
            )
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(15, 23, 42)
            pdf.text(formatPdfCurrency(payment.originalPrice), pageW - mR - 4, y + 9, { align: 'right' })

            // Coins discount row (only if discount was applied)
            if (payment.coinsUsed > 0) {
                y += 14
                pdf.setFillColor(240, 253, 244)     // emerald-50
                pdf.setDrawColor(167, 243, 208)
                pdf.rect(mL, y, bodyW, 13, 'F')
                pdf.rect(mL, y, bodyW, 13)
                pdf.setFontSize(8.5)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(4, 120, 87)         // emerald-700
                pdf.text(`Referral Coins Discount  (${payment.coinsUsed} coins)`, mL + 4, y + 8.5)
                pdf.setFont('helvetica', 'bold')
                pdf.text(`- ${formatPdfCurrency(payment.coinsUsed)}`, pageW - mR - 4, y + 8.5, { align: 'right' })
                y += 13
            } else {
                y += 14
            }

            /* ── TOTAL BOX (right-aligned) ─────────────────────────── */
            const boxW = 68
            const boxX = pageW - mR - boxW
            y += 6
            pdf.setFillColor(236, 253, 245)
            pdf.setDrawColor(167, 243, 208)
            pdf.roundedRect(boxX, y, boxW, 22, 3, 3, 'FD')
            pdf.setFontSize(7.5)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(4, 120, 87)
            pdf.text('Total Paid', pageW - mR - 4, y + 8, { align: 'right' })
            pdf.setFontSize(15)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(15, 23, 42)
            pdf.text(formatPdfCurrency(payment.amount), pageW - mR - 4, y + 18, { align: 'right' })

            /* ── PAYMENT REFERENCE SECTION ─────────────────────────── */
            y += 32
            pdf.setDrawColor(226, 232, 240)
            pdf.line(mL, y, pageW - mR, y)

            y += 8
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(15, 23, 42)
            pdf.text('Payment Reference', mL, y)

            y += 7
            const halfW = (bodyW - 6) / 2

            // Order ID
            pdf.setFillColor(248, 250, 252)
            pdf.setDrawColor(226, 232, 240)
            pdf.roundedRect(mL, y, halfW, 18, 2, 2, 'FD')
            pdf.setFontSize(7.5)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(16, 185, 129)          // emerald label
            pdf.text('Razorpay Order ID', mL + 4, y + 7)
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(15, 23, 42)
            pdf.text(payment.razorpayOrderId || '-', mL + 4, y + 14)

            // Payment ID
            const px2 = mL + halfW + 6
            pdf.setFillColor(248, 250, 252)
            pdf.roundedRect(px2, y, halfW, 18, 2, 2, 'FD')
            pdf.setFontSize(7.5)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(16, 185, 129)
            pdf.text('Razorpay Payment ID', px2 + 4, y + 7)
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(15, 23, 42)
            pdf.text(payment.razorpayPaymentId || '-', px2 + 4, y + 14)

            /* ── FOOTER ───────────────────────────────────────────── */
            y += 28
            pdf.setDrawColor(226, 232, 240)
            pdf.line(mL, y, pageW - mR, y)

            y += 8
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(15, 23, 42)
            pdf.text('Thank you for training with Gym Pro Fitness!', pageW / 2, y, { align: 'center' })

            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(100, 116, 139)
            pdf.text('This is a system generated invoice and does not require a physical signature.', pageW / 2, y + 7, { align: 'center' })

            pdf.save(`${payment.invoiceNumber}.pdf`)
        } finally {
            setDownloading(false)
        }
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
                            href="/member/payments"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto sm:justify-start"
                        >
                            Payment history
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Invoice Card ── */}
            {payment && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* ── Header band ─────────────────────────────── */}
                    <div className="bg-[#0f172a] px-5 py-5 sm:px-6">
                        {/* Mobile: stacked. Desktop: side-by-side */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            {/* Branding */}
                            <div>
                                <p className="text-base font-bold text-white">GYM PRO FITNESS</p>
                                <p className="mt-1 text-xs text-slate-400">support@gympro.com</p>
                                <p className="text-xs text-slate-400">+91 98765 43210</p>
                            </div>
                            {/* Invoice meta — left on mobile, right on desktop */}
                            <div className="sm:text-right">
                                <p className="text-base font-bold text-white">INVOICE</p>
                                <p className="mt-0.5 font-mono text-xs text-emerald-400">{payment.invoiceNumber}</p>
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
                                        {formatCurrency(payment.originalPrice)}
                                    </div>
                                </div>
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
                                            {formatCurrency(payment.originalPrice)}
                                        </td>
                                    </tr>
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
                            <p className="text-sm font-semibold text-slate-800">Thank you for training with Gym Pro Fitness!</p>
                            <p className="mt-1 text-xs text-slate-500">This is a system generated invoice and does not require a physical signature.</p>
                        </div>

                    </div>
                </div>
            )}

            {!payment && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/member/plans"
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Return to plans
                        </Link>
                        <Link
                            href="/member/payments"
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

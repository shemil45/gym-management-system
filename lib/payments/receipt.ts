/**
 * Receipt shape, formatters and PDF builder shared by both payment result
 * screens.
 *
 * The admin portal renders receipts at `/invoice`; the member portal renders
 * them at `/member/payments/result` inside its own chrome and design tokens.
 * The two look nothing alike on screen, but the downloaded PDF and the values
 * printed on it must be identical, so everything that decides *what* a receipt
 * says lives here and only the presentation differs per portal.
 */

export type ReceiptGym = {
    name: string
    logoUrl: string | null
    address: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    contactPhone: string | null
    contactEmail: string | null
    gstin: string | null
    showLogo: boolean
    showAddress: boolean
    showPhone: boolean
    showEmail: boolean
    showGstin: boolean
    footerMessage: string | null
    additionalNotes: string | null
}

export type PaymentReceipt = {
    amount: number
    coinsUsed: number
    invoiceNumber: string
    receiptNumber: string | null
    admissionFeeAmount: number | null
    membershipEndDate: string | null
    membershipStartDate: string | null
    originalPrice: number
    paymentDate: string
    paymentMethod: string
    paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded'
    planName: string
    razorpayOrderId: string | null
    razorpayPaymentId: string | null
    memberDisplayId: string
    memberFullName: string
    gym: ReceiptGym
}

export function formatReceiptDate(value: string | null) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

export function formatPaymentMethod(method: string) {
    return method
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

export function statusLabel(status: PaymentReceipt['paymentStatus']) {
    return status.charAt(0).toUpperCase() + status.slice(1)
}

/** Receipt numbers are issued per gym; the invoice number is the fallback. */
export function displayReceiptNumber(payment: PaymentReceipt) {
    return payment.receiptNumber || payment.invoiceNumber
}

export function formatGymAddressLine(gym: ReceiptGym) {
    const parts = [gym.address, gym.city, gym.state, gym.postalCode, gym.country].filter(Boolean)
    return parts.join(', ')
}

/**
 * `admissionFeeAmount`, when present, is already folded into
 * `originalPrice`/`amount` (see app/admin/members/actions.ts:
 * `totalAmount = planAmount + admissionFee`), so the plan line has to subtract
 * it back out or the fee is counted twice.
 */
export function planOnlyAmount(payment: PaymentReceipt) {
    return payment.originalPrice - (payment.admissionFeeAmount ?? 0)
}

export function hasAdmissionFee(payment: PaymentReceipt) {
    return payment.admissionFeeAmount !== null && payment.admissionFeeAmount > 0
}

export function receiptFooterMessage(payment: PaymentReceipt) {
    return (
        payment.gym.footerMessage ||
        `Thank you for training with ${payment.gym.name || 'us'}.`
    )
}

export function receiptFooterNote(payment: PaymentReceipt) {
    return (
        payment.gym.additionalNotes ||
        'This is a system generated receipt and does not require a physical signature.'
    )
}

/** jsPDF's built-in Helvetica cannot render ₹, so the PDF uses an ASCII prefix. */
function formatPdfCurrency(amount: number) {
    return `Rs. ${amount.toLocaleString('en-IN')}`
}

async function toDataUrl(url: string): Promise<string> {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

/**
 * Renders the A4 receipt and triggers the download. Browser only: it reaches
 * for `fetch` and `FileReader` to inline the gym logo.
 *
 * The layout is deliberately printed in the admin portal's slate/emerald
 * palette rather than either portal's screen theme, because it is a document
 * that gets emailed and filed, not a screen.
 */
export async function downloadReceiptPdf(payment: PaymentReceipt) {
    const { jsPDF } = await import('jspdf')

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210
    const mL = 16
    const mR = 16
    const bodyW = pageW - mL - mR

    /* ── HEADER ────────────────────────────────────────────── */
    pdf.setFillColor(15, 23, 42) // #0f172a slate-900
    pdf.rect(0, 0, pageW, 48, 'F')

    let logoDrawn = false
    if (payment.gym.showLogo && payment.gym.logoUrl) {
        try {
            pdf.addImage(await toDataUrl(payment.gym.logoUrl), mL, 10, 14, 14)
            logoDrawn = true
        } catch {
            logoDrawn = false
        }
    }
    const brandTextX = logoDrawn ? mL + 18 : mL

    // Left column – branding
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(payment.gym.name || 'Gym', brandTextX, 18)

    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(148, 163, 184) // slate-400
    let brandY = 27
    if (payment.gym.showAddress) {
        const addressLine = formatGymAddressLine(payment.gym)
        if (addressLine) {
            pdf.text(addressLine, brandTextX, brandY, { maxWidth: 110 })
            brandY += 7
        }
    }
    if (payment.gym.showEmail && payment.gym.contactEmail) {
        pdf.text(payment.gym.contactEmail, brandTextX, brandY)
        brandY += 7
    }
    if (payment.gym.showPhone && payment.gym.contactPhone) {
        pdf.text(payment.gym.contactPhone, brandTextX, brandY)
        brandY += 7
    }
    if (payment.gym.showGstin && payment.gym.gstin) {
        pdf.text(`GSTIN: ${payment.gym.gstin}`, brandTextX, brandY)
    }

    // Right column – receipt meta
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('RECEIPT', pageW - mR, 18, { align: 'right' })

    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(16, 185, 129) // emerald-500
    pdf.text(displayReceiptNumber(payment), pageW - mR, 27, { align: 'right' })
    pdf.setTextColor(148, 163, 184)
    pdf.text(formatReceiptDate(payment.paymentDate), pageW - mR, 34, { align: 'right' })

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
    pdf.setTextColor(100, 116, 139) // slate-500
    pdf.text('Payment Date', mL, y)
    pdf.text('Payment Method', 100, y)

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(15, 23, 42)
    pdf.text(formatReceiptDate(payment.paymentDate), mL, y + 7)
    pdf.text(formatPaymentMethod(payment.paymentMethod), 100, y + 7)

    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text('Member', mL, y + 16)
    pdf.text('Member ID', 100, y + 16)

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(15, 23, 42)
    pdf.text(payment.memberFullName, mL, y + 23)
    pdf.text(payment.memberDisplayId, 100, y + 23)

    /* ── TABLE ─────────────────────────────────────────────── */
    y += 34
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
        `${formatReceiptDate(payment.membershipStartDate)}  to  ${formatReceiptDate(payment.membershipEndDate)}`,
        85,
        y + 9,
    )
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(15, 23, 42)
    pdf.text(formatPdfCurrency(planOnlyAmount(payment)), pageW - mR - 4, y + 9, { align: 'right' })
    y += 14

    // Admission fee row (only if present and > 0)
    if (hasAdmissionFee(payment)) {
        pdf.setFillColor(255, 255, 255)
        pdf.setDrawColor(226, 232, 240)
        pdf.rect(mL, y, bodyW, 12, 'F')
        pdf.rect(mL, y, bodyW, 12)
        pdf.setFontSize(8.5)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(71, 85, 105)
        pdf.text('Admission Fee', mL + 4, y + 8)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(15, 23, 42)
        pdf.text(formatPdfCurrency(payment.admissionFeeAmount as number), pageW - mR - 4, y + 8, {
            align: 'right',
        })
        y += 12
    }

    // Coins discount row (only if discount was applied)
    if (payment.coinsUsed > 0) {
        pdf.setFillColor(240, 253, 244) // emerald-50
        pdf.setDrawColor(167, 243, 208)
        pdf.rect(mL, y, bodyW, 13, 'F')
        pdf.rect(mL, y, bodyW, 13)
        pdf.setFontSize(8.5)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(4, 120, 87) // emerald-700
        pdf.text(`Referral Coins Discount  (${payment.coinsUsed} coins)`, mL + 4, y + 8.5)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`- ${formatPdfCurrency(payment.coinsUsed)}`, pageW - mR - 4, y + 8.5, {
            align: 'right',
        })
        y += 13
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
    pdf.setTextColor(16, 185, 129)
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
    pdf.text(receiptFooterMessage(payment), pageW / 2, y, { align: 'center' })

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text(receiptFooterNote(payment), pageW / 2, y + 7, {
        align: 'center',
        maxWidth: bodyW,
    })

    pdf.save(`${displayReceiptNumber(payment)}.pdf`)
}

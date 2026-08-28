/**
 * Client-side Razorpay checkout plumbing for the member portal.
 *
 * The server actions in `app/member/plans/actions.ts` own the money: they price
 * the plan, reserve referral coins and write a `pending` payment row before the
 * checkout window ever opens. This module only opens that window and hands the
 * signed response back, so the browser is never the source of truth for an
 * amount.
 *
 * Confirmation deliberately does not happen here. The signed response is parked
 * in `sessionStorage` and the caller navigates to the portal's payment result
 * screen with `status=processing`,
 * which verifies the signature server-side and renders the receipt. Keeping the
 * verification on a dedicated screen means the confirmation survives the
 * navigation away from the checkout window.
 */

export interface RazorpaySuccessResponse {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
}

interface RazorpayInstance {
    open: () => void
    on: (
        event: 'payment.failed',
        handler: (response: { error?: { description?: string } }) => void,
    ) => void
}

interface RazorpayCheckoutOptions {
    amount: number
    currency: string
    description?: string
    handler: (response: RazorpaySuccessResponse) => void | Promise<void>
    key: string
    modal?: { ondismiss?: () => void }
    name: string
    notes?: Record<string, string>
    order_id: string
    prefill?: { email?: string; name?: string; phone?: string }
    theme?: { color?: string }
}

declare global {
    interface Window {
        Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance
    }
}

/**
 * Shared with the result screens, which read the payload back to verify the
 * payment: `/member/payments/result` for members, `/invoice` for admins.
 */
export function verificationStorageKey(invoiceNumber: string) {
    return `razorpay-result:${invoiceNumber}`
}

export interface StoredVerificationPayload {
    planId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
    useReferralCoins: boolean
}

/**
 * Injects Razorpay's checkout bundle on demand rather than on every member page
 * load. Resolves false instead of throwing so callers can show a toast.
 */
export function loadRazorpayScript(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        if (window.Razorpay) {
            resolve(true)
            return
        }

        const existing = document.querySelector<HTMLScriptElement>(
            'script[data-razorpay-checkout="true"]',
        )
        if (existing) {
            existing.addEventListener('load', () => resolve(true), { once: true })
            existing.addEventListener('error', () => resolve(false), { once: true })
            return
        }

        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.dataset.razorpayCheckout = 'true'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}

/** The subset of `createRazorpayOrder`'s success shape checkout actually needs. */
export interface RazorpayOrder {
    amount: number
    currency: string
    invoiceNumber: string
    keyId: string
    orderId: string
    prefills: { email: string; name: string; phone: string }
}

export interface OpenCheckoutArgs {
    order: RazorpayOrder
    /** Merchant name shown in the checkout header. */
    gymName: string
    planName: string
    /**
     * Overrides the checkout subtitle. Defaults to "<planName> membership",
     * which is right for a member buying a gym membership but wrong for a gym
     * paying for its own GMS Cloud subscription.
     */
    description?: string
    /** Signed response; the caller stores it and routes to the processing screen. */
    onSuccess: (response: RazorpaySuccessResponse) => void
    /**
     * Fired once when the member closes checkout without paying. `reason` carries
     * the gateway's decline description when Razorpay reported one.
     */
    onDismiss: (reason: string | null) => void
}

/** Approximates `--m-accent-strong`; Razorpay only accepts a hex value here. */
const CHECKOUT_THEME_COLOR = '#10b981'

/**
 * Opens checkout for an already-created order. Exactly one of `onSuccess` or
 * `onDismiss` runs: Razorpay fires `payment.failed` *before* the modal closes,
 * so the decline reason is captured and replayed through the dismiss path
 * rather than racing it.
 *
 * Returns false when the checkout bundle could not be loaded at all.
 */
export async function openRazorpayCheckout({
    order,
    gymName,
    planName,
    description,
    onSuccess,
    onDismiss,
}: OpenCheckoutArgs): Promise<boolean> {
    const loaded = await loadRazorpayScript()
    if (!loaded || !window.Razorpay) return false

    let settled = false
    let declineReason: string | null = null

    const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: gymName,
        description: description ?? `${planName} membership`,
        order_id: order.orderId,
        prefill: order.prefills,
        notes: { invoice_number: order.invoiceNumber, plan_name: planName },
        theme: { color: CHECKOUT_THEME_COLOR },
        modal: {
            ondismiss: () => {
                if (settled) return
                settled = true
                onDismiss(declineReason)
            },
        },
        handler: (response) => {
            if (settled) return
            settled = true
            onSuccess(response)
        },
    })

    checkout.on('payment.failed', (response) => {
        declineReason = response.error?.description ?? 'Payment was declined.'
    })

    checkout.open()
    return true
}

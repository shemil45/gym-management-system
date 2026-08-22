import { getPaymentResultForViewer } from '@/lib/payments/get-payment-result'
import ResultClient from './ResultClient'

export const metadata = { title: 'Payment' }

type SearchParams = Promise<{
    invoice?: string
    reason?: string
    status?: 'failure' | 'processing' | 'success'
}>

/**
 * Member-side payment outcome.
 *
 * Lives under `/member` rather than at the shared `/invoice` route so it
 * inherits the portal layout: top bar, bottom nav, back link and the
 * `.member-portal` token scope that carries dark mode. `/invoice` stays as the
 * admin surface and redirects members here.
 */
export default async function PaymentResultPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const params = await searchParams
    const invoiceNumber = params.invoice
    const status =
        params.status === 'failure'
            ? 'failure'
            : params.status === 'processing'
              ? 'processing'
              : 'success'

    // A receipt cannot be read until the payment is confirmed, so the
    // processing screen renders from the query string alone.
    const result =
        invoiceNumber && status !== 'processing'
            ? await getPaymentResultForViewer(invoiceNumber)
            : null

    return (
        <ResultClient
            invoiceNumber={invoiceNumber ?? null}
            payment={result && 'success' in result ? result.payment : null}
            reason={params.reason ?? null}
            status={status}
        />
    )
}

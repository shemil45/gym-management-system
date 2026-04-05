import { redirect } from 'next/navigation'
import { getPaymentResultForViewer } from '@/lib/payments/get-payment-result'
import ResultClient from './ResultClient'

type SearchParams = Promise<{
    invoice?: string
    portal?: 'admin' | 'member'
    reason?: string
    status?: 'failure' | 'processing' | 'success'
}>

export default async function PaymentResultPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const params = await searchParams
    const invoiceNumber = params.invoice
    const portal = params.portal === 'admin' ? 'admin' : 'member'
    const status =
        params.status === 'failure'
            ? 'failure'
            : params.status === 'processing'
                ? 'processing'
                : 'success'

    if (!invoiceNumber && status === 'success') {
        redirect(portal === 'admin' ? '/admin/payments' : '/member/plans')
    }

    const paymentResult =
        invoiceNumber && status !== 'processing'
            ? await getPaymentResultForViewer(invoiceNumber)
            : null

    return (
        <div className="space-y-6 px-4 pt-4 sm:px-6 sm:pt-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment status</h1>
                <p className="mt-1 text-sm text-gray-500">Review your latest membership payment outcome and download your invoice.</p>
            </div>

            <ResultClient
                invoiceNumber={invoiceNumber}
                payment={paymentResult && 'success' in paymentResult ? paymentResult.payment : null}
                portal={portal}
                reason={params.reason}
                status={status}
            />
        </div>
    )
}

import { redirect } from 'next/navigation'
import { getPaymentResult } from '../actions'
import ResultClient from './ResultClient'

type SearchParams = Promise<{
    invoice?: string
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
    const status =
        params.status === 'failure'
            ? 'failure'
            : params.status === 'processing'
                ? 'processing'
                : 'success'

    if (!invoiceNumber && status === 'success') {
        redirect('/member/plans')
    }

    const paymentResult =
        invoiceNumber && status !== 'processing'
            ? await getPaymentResult(invoiceNumber)
            : null

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment status</h1>
                <p className="mt-1 text-sm text-gray-500">Review your latest membership payment outcome and download your invoice.</p>
            </div>

            <ResultClient
                invoiceNumber={invoiceNumber}
                payment={paymentResult && 'success' in paymentResult ? paymentResult.payment : null}
                reason={params.reason}
                status={status}
            />
        </div>
    )
}

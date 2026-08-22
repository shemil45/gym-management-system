import Link from 'next/link'
import { IconDownload, IconReceipt } from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { formatCurrency } from '@/lib/utils/currency'
import {
    Card,
    EmptyState,
    LinkButton,
    Pill,
    Screen,
    SectionHeading,
    Stack,
} from '@/components/member/ui'

export const metadata = { title: 'Payments' }

const METHOD_LABEL: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    card: 'Card',
    bank_transfer: 'Bank transfer',
    razorpay: 'Online',
}

export default async function PaymentsPage() {
    const data = await getMemberPortalData()
    const history = data?.payments.history ?? []

    if (!data || history.length === 0) {
        return (
            <Screen title="Payments">
                <EmptyState
                    icon={<IconReceipt size={26} stroke={1.6} />}
                    title="No payments yet"
                    body="Every membership payment and its receipt will be listed here as soon as one is recorded."
                    action={
                        <LinkButton href="/member/membership" tone="quiet">
                            View my membership
                        </LinkButton>
                    }
                />
            </Screen>
        )
    }

    const paidThisYear = history
        .filter(
            (p) =>
                p.status === 'paid' &&
                new Date(p.date).getFullYear() === new Date().getFullYear(),
        )
        .reduce((sum, p) => sum + p.amount, 0)

    return (
        <Screen title="Payments">
            <Stack gap={14}>
                <Card className="p-4">
                    <p className="text-[13px] font-medium text-[var(--m-ink-2)]">
                        Paid in {new Date().getFullYear()}
                    </p>
                    <p className="m-num mt-1.5 text-[30px] font-semibold leading-none">
                        {formatCurrency(paidThisYear)}
                    </p>
                </Card>

                <SectionHeading>History</SectionHeading>
                <Card className="m-divide overflow-hidden">
                    {history.map((payment) => (
                        <div key={payment.id} className="px-4 py-3.5">
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="m-num text-[15.5px] font-semibold">
                                        {formatCurrency(payment.amount)}
                                    </p>
                                    <p className="mt-1 text-[12.5px] text-[var(--m-ink-3)]">
                                        {new Date(payment.date).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </p>
                                    <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--m-ink-3)]">
                                        <span>{METHOD_LABEL[payment.method] ?? payment.method}</span>
                                        {payment.receiptNumber ? (
                                            <span className="m-num">{payment.receiptNumber}</span>
                                        ) : null}
                                    </p>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <Pill
                                        tone={
                                            payment.status === 'paid'
                                                ? 'accent'
                                                : payment.status === 'pending'
                                                  ? 'warn'
                                                  : 'danger'
                                        }
                                    >
                                        {payment.status}
                                    </Pill>
                                    {payment.invoiceNumber ? (
                                        <Link
                                            href={`/member/payments/result?invoice=${encodeURIComponent(payment.invoiceNumber)}`}
                                            className="m-tap flex h-9 items-center gap-1.5 rounded-full border border-[var(--m-line)] px-3 text-[12.5px] font-medium"
                                        >
                                            <IconDownload size={14} stroke={1.8} />
                                            Receipt
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </Card>
            </Stack>
        </Screen>
    )
}

import Link from 'next/link'
import { IconChevronLeft, IconChevronRight, IconDownload, IconReceipt } from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { getMemberPaidInYear, getMemberPaymentHistory } from '@/lib/member/payment-history'
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

/** One edge of the pager. A span, not a disabled link, at the ends. */
function PagerLink({
    href,
    disabled,
    children,
}: {
    href: string
    disabled: boolean
    children: React.ReactNode
}) {
    const className = cn(
        'm-tap inline-flex h-9 items-center gap-1 rounded-full border border-[var(--m-line)] px-3 text-[12.5px] font-medium',
        disabled && 'pointer-events-none opacity-40',
    )
    if (disabled) {
        return (
            <span className={className} aria-disabled="true">
                {children}
            </span>
        )
    }
    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    )
}

export default async function PaymentsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const params = await searchParams
    const year = new Date().getFullYear()
    const [history, paidThisYear] = await Promise.all([
        getMemberPaymentHistory(Number(params.page ?? 1)),
        getMemberPaidInYear(year),
    ])

    if (!history || history.total === 0) {
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

    const pageHref = (page: number) => (page <= 1 ? '/member/payments' : `/member/payments?page=${page}`)

    return (
        <Screen title="Payments">
            <Stack gap={14}>
                <Card className="p-4">
                    <p className="text-[13px] font-medium text-[var(--m-ink-2)]">
                        Paid in {year}
                    </p>
                    <p className="m-num mt-1.5 text-[30px] font-semibold leading-none">
                        {formatCurrency(paidThisYear)}
                    </p>
                </Card>

                <SectionHeading>History</SectionHeading>
                <Card className="m-divide overflow-hidden">
                    {history.rows.map((payment) => (
                        <div key={payment.id} className="px-4 py-3.5">
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="m-num text-[15.5px] font-semibold">
                                        {formatCurrency(payment.amount)}
                                    </p>
                                    <p className="mt-1 text-[12.5px] text-[var(--m-ink-3)]">
                                        {new Date(payment.recordedAt).toLocaleString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            // Server-rendered: pin to the gym's clock, not the host's.
                                            timeZone: 'Asia/Kolkata',
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

                {history.pageCount > 1 ? (
                    <nav
                        aria-label="Payment history pages"
                        className="flex items-center justify-between gap-3 px-1"
                    >
                        <PagerLink href={pageHref(history.page - 1)} disabled={history.page <= 1}>
                            <IconChevronLeft size={15} stroke={1.8} />
                            Newer
                        </PagerLink>
                        <p className="m-num text-[12.5px] text-[var(--m-ink-3)]">
                            {history.from}–{history.to} of {history.total}
                        </p>
                        <PagerLink
                            href={pageHref(history.page + 1)}
                            disabled={history.page >= history.pageCount}
                        >
                            Older
                            <IconChevronRight size={15} stroke={1.8} />
                        </PagerLink>
                    </nav>
                ) : null}
            </Stack>
        </Screen>
    )
}

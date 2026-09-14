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

/**
 * Which page numbers to show: always the first, last and current, plus one
 * neighbour either side, with a gap marker where pages are skipped.
 * 1 2 3 … 7  /  1 … 4 5 6 … 12  /  1 … 10 11 12
 */
function pageItems(page: number, pageCount: number): Array<number | 'gap'> {
    if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1)
    const wanted = new Set([1, pageCount, page - 1, page, page + 1])
    // Keep the window three wide at the edges so it never shrinks to two.
    if (page <= 2) wanted.add(3)
    if (page >= pageCount - 1) wanted.add(pageCount - 2)
    const pages = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)
    const items: Array<number | 'gap'> = []
    pages.forEach((n, i) => {
        if (i > 0 && n - pages[i - 1] > 1) items.push('gap')
        items.push(n)
    })
    return items
}

const PAGER_ITEM =
    'm-tap inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-[12.5px] font-medium'

function PagerEdge({
    href,
    disabled,
    children,
}: {
    href: string
    disabled: boolean
    children: React.ReactNode
}) {
    const className = cn(
        PAGER_ITEM,
        'gap-1 border border-[var(--m-line)] px-3',
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

function Pager({
    page,
    pageCount,
    href,
}: {
    page: number
    pageCount: number
    href: (page: number) => string
}) {
    return (
        <nav aria-label="Payment history pages" className="flex flex-wrap items-center justify-center gap-1.5">
            <PagerEdge href={href(page - 1)} disabled={page <= 1}>
                <IconChevronLeft size={15} stroke={1.8} />
                Previous
            </PagerEdge>
            {pageItems(page, pageCount).map((item, i) =>
                item === 'gap' ? (
                    <span
                        key={`gap-${i}`}
                        className="inline-flex h-9 w-6 items-center justify-center text-[12.5px] text-[var(--m-ink-3)]"
                        aria-hidden="true"
                    >
                        …
                    </span>
                ) : item === page ? (
                    <span
                        key={item}
                        aria-current="page"
                        className={cn(PAGER_ITEM, 'm-num bg-[var(--m-ink)] text-[var(--m-surface)]')}
                    >
                        {item}
                    </span>
                ) : (
                    <Link
                        key={item}
                        href={href(item)}
                        className={cn(PAGER_ITEM, 'm-num border border-[var(--m-line)]')}
                    >
                        {item}
                    </Link>
                ),
            )}
            <PagerEdge href={href(page + 1)} disabled={page >= pageCount}>
                Next
                <IconChevronRight size={15} stroke={1.8} />
            </PagerEdge>
        </nav>
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
                    <Pager page={history.page} pageCount={history.pageCount} href={pageHref} />
                ) : null}
            </Stack>
        </Screen>
    )
}

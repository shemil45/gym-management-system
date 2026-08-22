import {
    IconArrowUpRight,
    IconCreditCard,
    IconGift,
    IconReceipt,
    IconSnowflake,
} from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { MembershipStatus } from '@/components/member/blocks'
import {
    EmptyState,
    LinkButton,
    Row,
    RowGroup,
    Screen,
    SectionHeading,
    Stack,
} from '@/components/member/ui'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata = { title: 'Plan' }

function formatDay(value: string | null) {
    if (!value) return 'Not set'
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

export default async function MembershipPage() {
    const data = await getMemberPortalData()

    if (!data) {
        return (
            <Screen title="Plan">
                <EmptyState
                    icon={<IconCreditCard size={26} stroke={1.6} />}
                    title="No membership found"
                    body="Your account is not linked to a member record yet."
                    action={
                        <LinkButton href="/member/support" tone="primary">
                            Contact the gym
                        </LinkButton>
                    }
                />
            </Screen>
        )
    }

    const { membership, payments, credits } = data

    return (
        <Screen title="Plan">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <Stack gap={14}>
                    <MembershipStatus
                        membership={membership}
                        memberCode={data.member.memberCode}
                    />

                    {/* No "Plan details" table under the card. It restated the
                        card almost line for line: plan name is the card title,
                        Ends is the card's renews date, Started and Term are the
                        card's own detail list. Price was the only fact it added,
                        and a price is a billing fact, so it moved there.

                        What follows the card is now the one thing a member comes
                        to this screen to do. */}
                    {membership.state !== 'expired' && membership.state !== 'expiring' ? (
                        <LinkButton
                            href="/member/membership/renew"
                            tone="primary"
                            full
                            trailingIcon={<IconArrowUpRight size={15} stroke={2.2} />}
                        >
                            Change or extend plan
                        </LinkButton>
                    ) : null}
                </Stack>

                <Stack gap={5}>
                    <SectionHeading>Billing</SectionHeading>
                    <RowGroup>
                        {/* The one fact the removed table carried that the card
                            does not. It reads better here anyway: what the plan
                            costs, immediately above what has been paid. */}
                        <Row
                            icon={<IconCreditCard size={18} stroke={1.7} />}
                            label="Plan price"
                            value={
                                membership.planPrice !== null ? (
                                    <span className="m-num">
                                        {formatCurrency(membership.planPrice)}
                                    </span>
                                ) : (
                                    'Not set'
                                )
                            }
                        />
                        <Row
                            href="/member/payments"
                            icon={<IconReceipt size={18} stroke={1.7} />}
                            label="Payments and receipts"
                            hint={
                                payments.last
                                    ? `${formatCurrency(payments.last.amount)} on ${formatDay(payments.last.date)}`
                                    : 'No payments recorded'
                            }
                        />
                        <Row
                            href="/member/referrals"
                            icon={<IconGift size={18} stroke={1.7} />}
                            label="Referral credits"
                            value={String(credits)}
                        />
                    </RowGroup>

                    {/* One row, not three. Holds, billing-date changes and
                        cancellations all reach the same people, so offering them
                        as separate destinations promised a choice that did not
                        exist behind it. */}
                    <SectionHeading>Need a change</SectionHeading>
                    <RowGroup>
                        <Row
                            href="/member/support"
                            icon={<IconSnowflake size={18} stroke={1.7} />}
                            label="Hold, cancel or change billing"
                            hint={`${data.gym.name} staff handle these so your unused days carry over`}
                        />
                    </RowGroup>
                </Stack>
            </div>
        </Screen>
    )
}

import {
    IconArrowUpRight,
    IconCalendarEvent,
    IconCreditCard,
    IconGift,
    IconLifebuoy,
    IconReceipt,
    IconSnowflake,
} from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { MembershipStatus } from '@/components/member/blocks'
import {
    Card,
    EmptyState,
    LinkButton,
    Row,
    RowGroup,
    Screen,
    SectionHeading,
    Stack,
} from '@/components/member/ui'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata = { title: 'Membership' }

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
            <Screen title="Membership">
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
        <Screen title="Membership">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <Stack gap={14}>
                    <MembershipStatus
                        membership={membership}
                        memberCode={data.member.memberCode}
                    />

                    <SectionHeading>Plan details</SectionHeading>
                    <RowGroup>
                        <Row label="Plan" value={membership.planName ?? 'None'} />
                        <Row
                            label="Price"
                            value={
                                membership.planPrice !== null
                                    ? formatCurrency(membership.planPrice)
                                    : 'Not set'
                            }
                        />
                        <Row
                            label="Term"
                            value={
                                membership.durationDays
                                    ? `${membership.durationDays} days`
                                    : 'Not set'
                            }
                        />
                        <Row label="Started" value={formatDay(membership.startDate)} />
                        <Row label="Ends" value={formatDay(membership.expiryDate)} />
                    </RowGroup>

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

                <Stack gap={14}>
                    <SectionHeading>Billing</SectionHeading>
                    <RowGroup>
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

                    <SectionHeading>Need a change</SectionHeading>
                    <RowGroup>
                        <Row
                            href="/member/support"
                            icon={<IconSnowflake size={18} stroke={1.7} />}
                            label="Put my membership on hold"
                            hint="Handled by the front desk"
                        />
                        <Row
                            href="/member/support"
                            icon={<IconCalendarEvent size={18} stroke={1.7} />}
                            label="Change my billing date"
                            hint="Handled by the front desk"
                        />
                        <Row
                            href="/member/support"
                            icon={<IconLifebuoy size={18} stroke={1.7} />}
                            label="Something else"
                        />
                    </RowGroup>

                    <Card className="p-4">
                        <p className="text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                            Holds and cancellations are processed by {data.gym.name} staff so your
                            remaining days are carried over correctly.
                        </p>
                    </Card>
                </Stack>
            </div>
        </Screen>
    )
}

import {
    IconArrowUpRight,
    IconGift,
    IconHistory,
    IconLifebuoy,
    IconReceipt,
    IconSparkles,
} from '@tabler/icons-react'
import type { MemberPortalData } from '@/lib/member/portal-data'
import { getNotifications } from '@/lib/member/notifications'
import { AnnouncementCard, MembershipStatus, SessionCard, WeekStrip } from './blocks'
import {
    Card,
    LinkButton,
    Row,
    RowGroup,
    Screen,
    SectionHeading,
    Stack,
} from './ui'

/**
 * Home, as a pure function of portal data.
 *
 * Mobile is one column ordered by urgency: can I train, am I showing up, what is
 * today's session, what did the gym say, everything else. Desktop keeps that
 * exact ranking and only moves the two lowest-priority blocks into a side
 * column so the fold does more work.
 */
export function HomeScreen({ data }: { data: MemberPortalData }) {
    const latest = getNotifications(data).find((n) => n.kind === 'announcement')

    return (
        <Screen>
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <div>
                    <Stack gap={14}>
                        <MembershipStatus
                            membership={data.membership}
                            memberCode={data.member.memberCode}
                        />

                        <WeekStrip activity={data.activity} />

                        <div className="lg:hidden">
                            <TrainingBlock data={data} />
                        </div>

                        {latest ? (
                            <div className="lg:hidden">
                                <AnnouncementCard
                                    title={latest.title}
                                    body={latest.body}
                                    at={latest.at}
                                />
                            </div>
                        ) : null}

                        <SectionHeading>More</SectionHeading>
                        <RowGroup>
                            <Row
                                href="/member/activity"
                                icon={<IconHistory size={18} stroke={1.7} />}
                                label="Attendance history"
                                hint={`${data.activity.allTime} visits all time`}
                            />
                            <Row
                                href="/member/payments"
                                icon={<IconReceipt size={18} stroke={1.7} />}
                                label="Payments and receipts"
                                hint={
                                    data.payments.last
                                        ? `Last paid ${new Date(data.payments.last.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                        : 'No payments yet'
                                }
                            />
                            <Row
                                href="/member/referrals"
                                icon={<IconGift size={18} stroke={1.7} />}
                                label="Refer a friend"
                                hint={`${data.credits} credits earned`}
                            />
                            <Row
                                href="/member/support"
                                icon={<IconLifebuoy size={18} stroke={1.7} />}
                                label="Help and contact"
                            />
                        </RowGroup>
                    </Stack>
                </div>

                <aside className="hidden lg:block">
                    <Stack gap={14}>
                        <TrainingBlock data={data} />
                        {latest ? (
                            <AnnouncementCard
                                title={latest.title}
                                body={latest.body}
                                at={latest.at}
                            />
                        ) : null}
                    </Stack>
                </aside>
            </div>
        </Screen>
    )
}

function TrainingBlock({ data }: { data: MemberPortalData }) {
    if (data.training.today) {
        return (
            <Stack gap={10}>
                <SectionHeading action={{ label: 'All sessions', href: '/member/train' }}>
                    Today
                </SectionHeading>
                <SessionCard session={data.training.today} />
            </Stack>
        )
    }

    return (
        <Stack gap={10}>
            <SectionHeading>Today</SectionHeading>
            <Card className="p-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                        <IconSparkles size={22} stroke={1.8} />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[15px] font-semibold tracking-[-0.015em]">
                            No training plan yet
                        </p>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                            Answer six questions about your goal and experience, and a weekly split
                            gets built for you.
                        </p>
                    </div>
                </div>
                <LinkButton
                    href="/member/train"
                    tone="primary"
                    full
                    className="mt-4"
                    trailingIcon={<IconArrowUpRight size={15} stroke={2.2} />}
                >
                    Build my plan
                </LinkButton>
            </Card>
        </Stack>
    )
}

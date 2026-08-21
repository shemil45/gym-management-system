import { IconArrowUpRight, IconSparkles } from '@tabler/icons-react'
import type { MemberPortalData } from '@/lib/member/portal-data'
import { getNotifications } from '@/lib/member/notifications'
import { AnnouncementCard, MembershipStatus, SessionCard, WeekStrip } from './blocks'
import { Card, LinkButton, Screen, SectionHeading, Stack } from './ui'

/**
 * Home, as a pure function of portal data.
 *
 * Four blocks, ordered by urgency: can I train, am I showing up, what is today's
 * session, what did the gym say. Nothing else. Payments, referrals and help live
 * in Account and are deliberately not mirrored here, so Home stays a status
 * screen rather than a second navigation menu.
 *
 * Each block is a single grid child placed explicitly at lg, so the desktop
 * two-column layout reuses the same nodes instead of rendering a hidden copy.
 */
export function HomeScreen({ data, greeting }: { data: MemberPortalData; greeting: string }) {
    const latest = getNotifications(data).find((n) => n.kind === 'announcement')

    return (
        <Screen title={greeting}>
            {/* Two column stacks, which happen to concatenate into exactly the
                mobile order we want: status, week, today, announcement. Each
                block therefore renders once, and the columns size independently
                instead of being locked to shared grid rows. */}
            <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <Stack gap={14}>
                    <MembershipStatus
                        membership={data.membership}
                        memberCode={data.member.memberCode}
                    />
                    <WeekStrip activity={data.activity} href="/member/activity" />
                </Stack>

                <Stack gap={14}>
                    <TrainingBlock data={data} />
                    {latest ? (
                        <AnnouncementCard title={latest.title} body={latest.body} at={latest.at} />
                    ) : null}
                </Stack>
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

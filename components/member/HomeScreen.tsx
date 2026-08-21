import { IconArrowUpRight, IconSparkles } from '@tabler/icons-react'
import type { MemberPortalData } from '@/lib/member/portal-data'
import { getNotifications } from '@/lib/member/notifications'
import {
    AnnouncementBanner,
    AnnouncementCard,
    MembershipStatus,
    SessionCard,
    WeekStrip,
} from './blocks'
import { Card, LinkButton, Screen, SectionHeading, Stack } from './ui'

/**
 * Home, as a pure function of portal data.
 *
 * Ordered by urgency: can I train, is anything different today, am I showing
 * up, what is today's session. Payments, referrals and help live in Account and
 * are deliberately not mirrored here, so Home stays a status screen rather than
 * a second navigation menu.
 */
export function HomeScreen({ data, greeting }: { data: MemberPortalData; greeting: string }) {
    const announcements = getNotifications(data).filter((n) => n.kind === 'announcement')
    const latest = announcements[0] ?? null
    const unreadCount = announcements.filter((a) => a.unread).length

    /*
      An announcement earns prominence by being unread, not by existing. While
      unread it sits second in the primary column, directly under the membership
      hero: the hero answers "can I train", the announcement answers "is
      anything different today", and both are read before deciding to go. Once
      read it drops to the quiet card in the secondary column, so the screen
      returns to its resting state instead of shouting forever.
    */
    const isNew = Boolean(latest?.unread)

    return (
        <Screen title={greeting}>
            {/* Two column stacks, which concatenate into the mobile order we
                want. Each block renders once, and the columns size
                independently instead of being locked to shared grid rows. */}
            <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <Stack gap={14}>
                    <MembershipStatus
                        membership={data.membership}
                        memberCode={data.member.memberCode}
                    />

                    {latest && isNew ? (
                        <AnnouncementBanner
                            title={latest.title}
                            body={latest.body}
                            at={latest.at}
                            extraUnread={unreadCount - 1}
                        />
                    ) : null}

                    <WeekStrip activity={data.activity} href="/member/activity" />
                </Stack>

                <Stack gap={14}>
                    <TrainingBlock data={data} />

                    {latest && !isNew ? (
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

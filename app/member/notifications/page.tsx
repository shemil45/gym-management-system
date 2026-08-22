import Link from 'next/link'
import {
    IconBell,
    IconBellRinging,
    IconFlame,
    IconReceipt,
    IconSpeakerphone,
} from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { getNotifications, type NotificationKind } from '@/lib/member/notifications'
import { relativeTime } from '@/components/member/blocks'
import { Card, EmptyState, Screen, Stack } from '@/components/member/ui'
import { cn } from '@/lib/utils/cn'

export const metadata = { title: 'Notifications' }

const ICONS: Record<NotificationKind, typeof IconBell> = {
    membership: IconBellRinging,
    payment: IconReceipt,
    activity: IconFlame,
    announcement: IconSpeakerphone,
}

export default async function NotificationsPage() {
    const data = await getMemberPortalData()
    const items = data ? getNotifications(data) : []

    if (items.length === 0) {
        return (
            <Screen title="Notifications">
                <EmptyState
                    icon={<IconBell size={26} stroke={1.6} />}
                    title="Nothing new"
                    body="Renewal reminders, payment receipts and gym announcements land here."
                />
            </Screen>
        )
    }

    return (
        <Screen title="Notifications">
            <Stack gap={10}>
                {items.map((item) => {
                    const Icon = ICONS[item.kind]
                    const body = (
                        <Card
                            className={cn(
                                'flex gap-3 p-4',
                                item.urgent && 'border-[var(--m-warn)]',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]',
                                    item.urgent
                                        ? 'bg-[var(--m-warn-wash)] text-[var(--m-warn-ink)]'
                                        : 'bg-[var(--m-surface-2)] text-[var(--m-ink-2)]',
                                )}
                            >
                                <Icon size={19} stroke={1.8} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <p
                                        className={cn(
                                            'text-[14.5px] leading-snug tracking-[-0.01em]',
                                            item.unread ? 'font-semibold' : 'font-medium',
                                        )}
                                    >
                                        {item.title}
                                    </p>
                                    <span className="m-num shrink-0 pt-0.5 text-[11.5px] text-[var(--m-ink-3)]">
                                        {relativeTime(item.at)}
                                    </span>
                                </div>
                                <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                                    {item.body}
                                </p>
                            </div>
                        </Card>
                    )

                    return item.href ? (
                        <Link key={item.id} href={item.href} className="m-tap block">
                            {body}
                        </Link>
                    ) : (
                        <div key={item.id}>{body}</div>
                    )
                })}
            </Stack>
        </Screen>
    )
}

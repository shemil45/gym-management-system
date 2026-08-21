import { IconCalendarMonth, IconClockHour4, IconFlame, IconTrophy } from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { WeekStrip } from '@/components/member/blocks'
import {
    Card,
    EmptyState,
    LinkButton,
    Screen,
    SectionHeading,
    Stack,
    StatTile,
} from '@/components/member/ui'
import { cn } from '@/lib/utils/cn'

export const metadata = { title: 'Activity' }

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dayKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function duration(from: string, to: string | null) {
    if (!to) return null
    const mins = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export default async function ActivityPage() {
    const data = await getMemberPortalData()

    if (!data) {
        return (
            <Screen title="Activity">
                <EmptyState
                    icon={<IconCalendarMonth size={26} stroke={1.6} />}
                    title="No activity to show"
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

    const { activity } = data

    if (activity.allTime === 0) {
        return (
            <Screen title="Activity">
                <Stack gap={14}>
                    <EmptyState
                        icon={<IconFlame size={26} stroke={1.6} />}
                        title="No visits yet"
                        body="Once you scan your pass at the door, every visit shows up here with your streak and monthly totals."
                        action={
                            <LinkButton href="/member/pass" tone="accent">
                                Show my pass
                            </LinkButton>
                        }
                    />
                </Stack>
            </Screen>
        )
    }

    // Six-week trailing grid, one column per week, Monday first.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const gridStart = new Date(
        today.getTime() - (((today.getDay() + 6) % 7) + 35) * 86_400_000,
    )
    const active = new Set(activity.activeDays)
    const weeks = Array.from({ length: 6 }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => new Date(gridStart.getTime() + (w * 7 + d) * 86_400_000)),
    )

    return (
        <Screen title="Activity">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <Stack gap={14}>
                    <div className="grid grid-cols-3 gap-3">
                        <StatTile
                            label="Streak"
                            value={activity.streak}
                            unit={activity.streak === 1 ? 'day' : 'days'}
                            icon={<IconFlame size={15} stroke={1.8} />}
                            emphasis
                        />
                        <StatTile
                            label="This month"
                            value={activity.thisMonth}
                            icon={<IconCalendarMonth size={15} stroke={1.8} />}
                        />
                        <StatTile
                            label="All time"
                            value={activity.allTime}
                            icon={<IconTrophy size={15} stroke={1.8} />}
                        />
                    </div>

                    <WeekStrip activity={activity} />

                    <SectionHeading>Last six weeks</SectionHeading>
                    <Card className="overflow-x-auto p-4">
                        <div className="flex min-w-[280px] gap-1.5">
                            {weeks.map((week, wi) => (
                                <div key={wi} className="flex flex-1 flex-col gap-1.5">
                                    {week.map((date) => {
                                        const key = dayKey(date)
                                        const trained = active.has(key)
                                        const future = date > today
                                        return (
                                            <span
                                                key={key}
                                                title={`${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${trained ? 'trained' : 'no visit'}`}
                                                className={cn(
                                                    'aspect-square w-full rounded-[6px]',
                                                    trained
                                                        ? 'bg-[var(--m-accent-strong)]'
                                                        : future
                                                          ? 'bg-[var(--m-surface-2)] opacity-40'
                                                          : 'bg-[var(--m-surface-2)]',
                                                )}
                                            />
                                        )
                                    })}
                                    <span className="mt-1 text-center text-[9.5px] text-[var(--m-ink-3)]">
                                        {week[0].getDate() <= 7 ? MONTH_LABELS[week[0].getMonth()] : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Stack>

                <Stack gap={14}>
                    <SectionHeading>Recent visits</SectionHeading>
                    <Card className="m-divide overflow-hidden">
                        {activity.recent.slice(0, 12).map((visit) => {
                            const at = new Date(visit.checkInTime)
                            const length = duration(visit.checkInTime, visit.checkOutTime)
                            return (
                                <div
                                    key={visit.id}
                                    className="flex min-h-[56px] items-center gap-3 px-4 py-3"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--m-surface-2)] text-[var(--m-ink-2)]">
                                        <IconClockHour4 size={17} stroke={1.7} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[14px] font-medium">
                                            {at.toLocaleDateString('en-IN', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </p>
                                        <p className="m-num mt-0.5 text-[12.5px] text-[var(--m-ink-3)]">
                                            {at.toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true,
                                            })}
                                        </p>
                                    </div>
                                    {length ? (
                                        <span className="m-num shrink-0 text-[13px] text-[var(--m-ink-2)]">
                                            {length}
                                        </span>
                                    ) : null}
                                </div>
                            )
                        })}
                    </Card>
                </Stack>
            </div>
        </Screen>
    )
}

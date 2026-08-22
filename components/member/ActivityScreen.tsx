import { IconCalendarMonth, IconClockHour4, IconFlame, IconTrophy } from '@tabler/icons-react'
import type { ActivitySummary } from '@/lib/member/portal-data'
import { Card, EmptyState, LinkButton, Screen, SectionHeading, Stack, StatTile } from './ui'
import { cn } from '@/lib/utils/cn'

/*
  Activity.

  This screen used to carry four views of one dataset: three stat tiles, the
  week strip from Home (which repeated the streak tile), a twelve-week grid that
  repeated that week again, and the visit list. A member asking "am I showing
  up?" needs one summary and one record, so it is now two: the totals, and the
  visits themselves, with a compact calendar between them for shape.
*/

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const WEEKS_SHOWN = 8

function dayKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function duration(from: string, to: string | null) {
    if (!to) return null
    const mins = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function ActivityScreen({ activity }: { activity: ActivitySummary }) {
    if (activity.allTime === 0) {
        return (
            <Screen title="Activity">
                <EmptyState
                    icon={<IconFlame size={26} stroke={1.6} />}
                    title="No visits yet"
                    body="Every visit shows up here with your streak and monthly totals as soon as you check in at the gym."
                    action={
                        <LinkButton href="/member/train" tone="accent">
                            Go to Train
                        </LinkButton>
                    }
                />
            </Screen>
        )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * 86_400_000)
    const gridStart = new Date(monday.getTime() - (WEEKS_SHOWN - 1) * 7 * 86_400_000)
    const active = new Set(activity.activeDays)

    // Rows are weekdays and columns are weeks, so the calendar reads left to
    // right like a timeline and stays legible when the cells are small.
    const rows = WEEKDAY_INITIALS.map((initial, weekday) => ({
        initial,
        weekday,
        days: Array.from({ length: WEEKS_SHOWN }, (_, week) => {
            const date = new Date(gridStart.getTime() + (week * 7 + weekday) * 86_400_000)
            return { date, trained: active.has(dayKey(date)), future: date > today }
        }),
    }))

    const monthsSpanned = new Set(
        rows.flatMap((r) => r.days.filter((d) => !d.future).map((d) => d.date.getMonth())),
    ).size

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

                    <SectionHeading>Last {WEEKS_SHOWN} weeks</SectionHeading>
                    <Card className="p-4">
                        <div className="flex flex-col gap-1">
                            {rows.map((row) => (
                                <div key={row.weekday} className="flex items-center gap-1.5">
                                    <span
                                        aria-hidden="true"
                                        className="w-3 shrink-0 text-[10px] font-medium text-[var(--m-ink-3)]"
                                    >
                                        {row.initial}
                                    </span>
                                    <div className="flex flex-1 gap-1">
                                        {row.days.map(({ date, trained, future }) => (
                                            <span
                                                key={dayKey(date)}
                                                /* A real label, not a title tooltip: hover
                                                   text is invisible on a touch screen. */
                                                aria-label={`${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}, ${trained ? 'trained' : 'no visit'}`}
                                                className={cn(
                                                    'h-4 flex-1 rounded-[4px]',
                                                    trained
                                                        ? 'bg-[var(--m-accent-strong)]'
                                                        : 'bg-[var(--m-surface-2)]',
                                                    future && 'opacity-40',
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Without this the colours are unexplained, and there is
                            no hover state on a phone to explain them. */}
                        <div className="mt-3.5 flex items-center gap-4 border-t border-[var(--m-line-soft)] pt-3 text-[11.5px] text-[var(--m-ink-3)]">
                            <span className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-[4px] bg-[var(--m-accent-strong)]" />
                                Trained
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-[4px] bg-[var(--m-surface-2)]" />
                                No visit
                            </span>
                            <span className="ml-auto">
                                {monthsSpanned > 1 ? 'Oldest on the left' : null}
                            </span>
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

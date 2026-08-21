import Link from 'next/link'
import {
    IconAlertTriangle,
    IconArrowUpRight,
    IconBarbell,
    IconChevronRight,
    IconPlayerPlay,
    IconSnowflake,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import type {
    ActivitySummary,
    MembershipSummary,
    TrainingSession,
} from '@/lib/member/portal-data'
import { Bezel, Card, LinkButton, Pill } from '@/components/member/ui'

/* ------------------------------------------------------- membership card */

const STATE_COPY: Record<
    MembershipSummary['state'],
    { label: string; tone: 'accent' | 'warn' | 'danger' | 'neutral' }
> = {
    active: { label: 'Active', tone: 'accent' },
    expiring: { label: 'Expiring soon', tone: 'warn' },
    expired: { label: 'Expired', tone: 'danger' },
    frozen: { label: 'On hold', tone: 'neutral' },
    inactive: { label: 'Inactive', tone: 'neutral' },
}

function formatDay(value: string | null) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

/**
 * The single most-glanced element in the portal: can I train, and for how long.
 * Uses the double-bezel so it reads as the one physical object on the screen.
 */
export function MembershipStatus({
    membership,
    memberCode,
    showRenew = true,
}: {
    membership: MembershipSummary
    memberCode: string
    showRenew?: boolean
}) {
    const state = STATE_COPY[membership.state]
    const days = membership.daysRemaining
    const needsAction = membership.state === 'expiring' || membership.state === 'expired'
    const barPct = Math.round((1 - membership.elapsed) * 100)

    return (
        <Bezel className="m-rise">
            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-[17px] font-semibold tracking-[-0.02em]">
                            {membership.planName ?? 'No plan assigned'}
                        </p>
                        <p className="m-num mt-0.5 text-[12px] text-[var(--m-ink-3)]">
                            {memberCode}
                        </p>
                    </div>
                    <Pill tone={state.tone}>
                        {membership.state === 'frozen' ? <IconSnowflake size={13} /> : null}
                        {needsAction ? <IconAlertTriangle size={13} /> : null}
                        {state.label}
                    </Pill>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                        <p className="flex items-baseline gap-1.5">
                            <span
                                className={cn(
                                    'm-num text-[44px] font-semibold leading-none',
                                    membership.state === 'expired' && 'text-[var(--m-danger)]',
                                )}
                            >
                                {days === null ? '-' : Math.abs(days)}
                            </span>
                            <span className="text-[13px] font-medium text-[var(--m-ink-2)]">
                                {days !== null && days < 0 ? 'days overdue' : 'days left'}
                            </span>
                        </p>
                        <p className="mt-1.5 text-[12.5px] text-[var(--m-ink-3)]">
                            {membership.state === 'expired' ? 'Ended' : 'Renews'}{' '}
                            {formatDay(membership.expiryDate)}
                        </p>
                    </div>

                    {/* Term detail only appears once the card is wide enough to
                        carry it. On a phone the number and date are the whole story. */}
                    <dl className="hidden text-right sm:block">
                        <dt className="text-[11.5px] text-[var(--m-ink-3)]">Started</dt>
                        <dd className="m-num text-[13px] font-medium">
                            {formatDay(membership.startDate)}
                        </dd>
                        {membership.durationDays ? (
                            <>
                                <dt className="mt-2 text-[11.5px] text-[var(--m-ink-3)]">Term</dt>
                                <dd className="m-num text-[13px] font-medium">
                                    {membership.durationDays} days
                                </dd>
                            </>
                        ) : null}
                    </dl>
                </div>

                {/* Term progress. No filled dashboard track: a hairline rail with a
                    single accent fill reads at a glance without looking like admin UI. */}
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--m-surface-2)]">
                    <div
                        className={cn(
                            'h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
                            membership.state === 'expired'
                                ? 'bg-[var(--m-danger)]'
                                : membership.state === 'expiring'
                                  ? 'bg-[var(--m-warn)]'
                                  : 'bg-[var(--m-accent-strong)]',
                        )}
                        style={{ width: `${Math.min(100, Math.max(2, barPct))}%` }}
                    />
                </div>

                {showRenew && needsAction ? (
                    <LinkButton
                        href="/member/membership/renew"
                        tone={membership.state === 'expired' ? 'primary' : 'accent'}
                        full
                        className="mt-5"
                        trailingIcon={<IconArrowUpRight size={15} stroke={2.2} />}
                    >
                        Renew now
                    </LinkButton>
                ) : null}
            </div>
        </Bezel>
    )
}

/* ------------------------------------------------------------ week strip */

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function dayKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Seven chips, current week, Monday first. The fastest read of "am I showing up".
 *
 * When `href` is set the whole card is the entry point to the full history,
 * which is a far better touch target than a menu row and lets Home drop its
 * duplicate navigation list.
 */
export function WeekStrip({
    activity,
    href,
}: {
    activity: ActivitySummary
    href?: string
}) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * 86_400_000)
    const active = new Set(activity.activeDays)

    const inner = (
        <>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="flex items-center gap-1 text-[13px] font-medium text-[var(--m-ink-2)]">
                        This week
                        {href ? (
                            <IconChevronRight
                                size={15}
                                stroke={2}
                                className="text-[var(--m-ink-3)]"
                            />
                        ) : null}
                    </p>
                    <p className="m-num mt-1 text-[24px] font-semibold leading-none">
                        {activity.thisWeek}
                        <span className="ml-1.5 font-sans text-[12.5px] font-medium text-[var(--m-ink-3)]">
                            {activity.thisWeek === 1 ? 'visit' : 'visits'}
                        </span>
                    </p>
                </div>
                {activity.streak > 0 ? (
                    <Pill tone="accent">
                        {activity.streak} day{activity.streak === 1 ? '' : 's'} in a row
                    </Pill>
                ) : (
                    <Pill>No streak yet</Pill>
                )}
            </div>

            <ul className="mt-4 flex justify-between gap-1.5">
                {DAY_LETTERS.map((letter, index) => {
                    const date = new Date(monday.getTime() + index * 86_400_000)
                    const key = dayKey(date)
                    const trained = active.has(key)
                    const isToday = key === dayKey(today)
                    const future = date > today

                    return (
                        <li key={key} className="flex flex-1 flex-col items-center gap-1.5">
                            <span className="text-[10.5px] font-medium text-[var(--m-ink-3)]">
                                {letter}
                            </span>
                            <span
                                aria-label={`${date.toLocaleDateString('en-IN', { weekday: 'long' })}: ${trained ? 'trained' : 'no visit'}`}
                                className={cn(
                                    'flex h-9 w-full max-w-[40px] items-center justify-center rounded-[11px] text-[12px] font-semibold',
                                    trained
                                        ? 'bg-[var(--m-accent)] text-[var(--m-accent-ink)]'
                                        : future
                                          ? 'bg-[var(--m-surface-2)] text-[var(--m-ink-3)]/60'
                                          : 'bg-[var(--m-surface-2)] text-[var(--m-ink-3)]',
                                    isToday && !trained && 'ring-2 ring-inset ring-[var(--m-ink)]',
                                )}
                            >
                                {date.getDate()}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </>
    )

    if (href) {
        return (
            <Link href={href} className="m-tap block" aria-label="This week, open full activity">
                <Card className="p-4">{inner}</Card>
            </Link>
        )
    }

    return <Card className="p-4">{inner}</Card>
}

/* ---------------------------------------------------------- session card */

export function SessionCard({
    session,
    href = '/member/train',
}: {
    session: TrainingSession
    href?: string
}) {
    const preview = session.exercises.slice(0, 3)
    const extra = session.exercises.length - preview.length

    return (
        <Card className="overflow-hidden">
            <div className="flex items-start gap-3 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                    <IconBarbell size={22} stroke={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-medium text-[var(--m-ink-3)]">
                        {session.day}
                    </p>
                    <p className="truncate text-[16px] font-semibold tracking-[-0.015em]">
                        {session.focus}
                    </p>
                </div>
            </div>

            <ul className="m-divide border-t border-[var(--m-line-soft)]">
                {preview.map((exercise) => (
                    <li
                        key={exercise.name}
                        className="flex min-h-[44px] items-center gap-3 px-4 py-2.5"
                    >
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">
                            {exercise.name}
                        </span>
                        <span className="m-num shrink-0 text-[12.5px] text-[var(--m-ink-2)]">
                            {exercise.sets} x {exercise.reps}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--m-line-soft)] p-3 pl-4">
                <span className="text-[12.5px] text-[var(--m-ink-3)]">
                    {extra > 0 ? `+${extra} more` : `${session.exercises.length} exercises`}
                </span>
                <LinkButton
                    href={href}
                    tone="quiet"
                    size="sm"
                    leadingIcon={<IconPlayerPlay size={15} stroke={2} />}
                >
                    Open session
                </LinkButton>
            </div>
        </Card>
    )
}

/* --------------------------------------------------------- announcement */

export function AnnouncementCard({
    title,
    body,
    at,
    href = '/member/notifications',
}: {
    title: string
    body: string
    at: string
    href?: string
}) {
    return (
        <Link href={href} className="m-tap block">
            <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-[11.5px] font-medium text-[var(--m-ink-3)]">
                        From the gym
                    </p>
                    <span className="m-num text-[11.5px] text-[var(--m-ink-3)]">
                        {relativeTime(at)}
                    </span>
                </div>
                <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.015em]">{title}</p>
                <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                    {body}
                </p>
            </Card>
        </Link>
    )
}

export function relativeTime(value: string) {
    const diff = Date.now() - new Date(value).getTime()
    const mins = Math.round(diff / 60_000)
    if (mins < 60) return `${Math.max(1, mins)}m ago`
    const hours = Math.round(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

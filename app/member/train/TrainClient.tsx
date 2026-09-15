'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
    IconApple,
    IconBarbell,
    IconMessageCircle,
    IconRefresh,
    IconSparkles,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import type { TrainingSummary } from '@/lib/member/portal-data'
import { SAMPLE_TRAINING } from '@/lib/member/sample-training'
import {
    Button,
    Card,
    EmptyState,
    LinkButton,
    Pill,
    Screen,
    SectionHeading,
    Stack,
    StatTile,
} from '@/components/member/ui'
import { generateWorkoutPlan } from '@/app/member/workout/actions'
import { generateNutritionPlan } from '@/app/member/nutrition/actions'

/*
  Training.

  A weekly split is a list of lists, which is the worst thing to put on a phone
  as one long scroll. Instead the week is a scroll-snap day picker (thumb flick,
  44px targets) and only one day's exercises render at a time.

  Plan building lives here rather than on the questionnaire so the loading
  state sits where the result appears. The questionnaire redirects back with
  `?build=1` and the effect below picks that up once.

  The generate actions take 15-30s. They are deliberately NOT wrapped in
  startTransition: React 19 entangles navigations with an in-flight async
  transition, which froze the bottom nav for the whole build. Plain state
  keeps the rest of the portal usable while the coach writes.

  Because a member can leave and come back mid-build, the in-flight build is
  noted in sessionStorage. On return the screen shows the progress card and
  refreshes until the plan version advances past the one the build started
  from, then clears the note. That also stops a second build being fired while
  the first is still running.
*/

const BUILD_KEY = 'm-train-build'
const BUILD_TTL_MS = 3 * 60_000
const POLL_MS = 5_000

type BuildNote = { startedAt: number; fromVersion: number }

function readBuildNote(): BuildNote | null {
    try {
        const raw = sessionStorage.getItem(BUILD_KEY)
        if (!raw) return null
        const note = JSON.parse(raw) as BuildNote
        if (Date.now() - note.startedAt > BUILD_TTL_MS) {
            sessionStorage.removeItem(BUILD_KEY)
            return null
        }
        return note
    } catch {
        return null
    }
}

function writeBuildNote(note: BuildNote | null) {
    try {
        if (note) sessionStorage.setItem(BUILD_KEY, JSON.stringify(note))
        else sessionStorage.removeItem(BUILD_KEY)
    } catch {
        // Private mode or storage blocked: the build still runs, it just
        // will not survive leaving the screen.
    }
}

function formatBuiltAt(iso: string | null): string {
    if (!iso) return 'Built by your coach'
    const at = new Date(iso)
    const minutes = (Date.now() - at.getTime()) / 60_000
    if (minutes < 2) return 'Built just now'
    if (minutes < 60) return `Built ${Math.round(minutes)} min ago`
    if (minutes < 60 * 24) return `Built today`
    return `Built ${at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}

export default function TrainClient({
    training,
    aiTrainerEnabled,
}: {
    training: TrainingSummary
    aiTrainerEnabled: boolean
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [preview, setPreview] = useState(false)
    const [active, setActive] = useState(0)
    const [building, setBuilding] = useState(false)
    const autoBuilt = useRef(false)
    const currentVersion = training.version ?? 0

    // Returned mid-build: pick the note up and keep refreshing until the
    // plan version moves past where the build started.
    useEffect(() => {
        const note = readBuildNote()
        if (!note) return
        if (currentVersion > note.fromVersion) {
            writeBuildNote(null)
            setBuilding(false)
            toast.success('Your new plan is ready')
            return
        }
        setBuilding(true)
        const timer = window.setInterval(() => {
            if (!readBuildNote()) {
                window.clearInterval(timer)
                setBuilding(false)
                return
            }
            router.refresh()
        }, POLL_MS)
        return () => window.clearInterval(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentVersion])

    async function build() {
        if (!training.hasProfile) {
            router.push('/member/train/profile')
            return
        }
        if (building || readBuildNote()) return
        setBuilding(true)
        writeBuildNote({ startedAt: Date.now(), fromVersion: currentVersion })
        try {
            const [workout, nutrition] = await Promise.all([
                generateWorkoutPlan(),
                generateNutritionPlan(),
            ])
            if ('error' in workout) {
                toast.error('Could not build your workout plan', { description: workout.error })
            }
            if ('error' in nutrition) {
                toast.error('Could not build your nutrition targets', {
                    description: nutrition.error,
                })
            }
            if ('success' in workout || 'success' in nutrition) {
                setPreview(false)
                setActive(0)
                router.refresh()
            }
        } catch (error) {
            toast.error('Could not reach the coach', {
                description: error instanceof Error ? error.message : 'Please try again.',
            })
        } finally {
            writeBuildNote(null)
            setBuilding(false)
        }
    }

    // Arrive from the questionnaire: build once, then drop the flag from the
    // URL so a reload or back-navigation does not generate again.
    useEffect(() => {
        if (searchParams.get('build') !== '1' || autoBuilt.current) return
        autoBuilt.current = true
        router.replace('/member/train')
        if (aiTrainerEnabled && training.hasProfile) void build()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const plan = training.hasPlan ? training : preview ? SAMPLE_TRAINING : null

    if (!plan) {
        return (
            <Screen title="Train">
                <Stack gap={14}>
                    <EmptyState
                        icon={<IconSparkles size={26} stroke={1.6} />}
                        title={building ? 'Writing your plan' : 'No plan yet'}
                        body={
                            building
                                ? 'The coach is putting together your weekly split and daily targets. This takes about half a minute.'
                                : aiTrainerEnabled
                                  ? 'Tell us your goal, experience and how many days a week you can train. You get a weekly split you can follow at this gym.'
                                  : 'Plans are not available at this gym yet. You can still preview what one looks like.'
                        }
                        action={
                            <div className="flex flex-col gap-2.5 sm:flex-row">
                                {aiTrainerEnabled ? (
                                    <Button tone="primary" disabled={building} onClick={build}>
                                        {building ? 'Building' : 'Build my plan'}
                                    </Button>
                                ) : null}
                                <Button
                                    tone="quiet"
                                    disabled={building}
                                    onClick={() => setPreview(true)}
                                >
                                    Preview a sample week
                                </Button>
                            </div>
                        }
                    />
                    {aiTrainerEnabled ? <CoachCard /> : null}
                </Stack>
            </Screen>
        )
    }

    const index = Math.min(active, plan.sessions.length - 1)
    const session = plan.sessions[index]

    return (
        <Screen title="Train">
            <Stack gap={14}>
                {preview ? (
                    <div className="flex items-center justify-between gap-3 rounded-[var(--m-r-control)] bg-[var(--m-surface-2)] px-3.5 py-2.5">
                        <Pill>Sample plan</Pill>
                        <button
                            type="button"
                            onClick={() => setPreview(false)}
                            className="m-tap h-9 rounded-full px-2 text-[13px] font-medium text-[var(--m-ink-2)]"
                        >
                            Close preview
                        </button>
                    </div>
                ) : building ? (
                    <BuildingCard />
                ) : aiTrainerEnabled ? (
                    <div className="flex items-center justify-between gap-3 rounded-[var(--m-r-control)] bg-[var(--m-surface-2)] px-3.5 py-2.5">
                        <p
                            className="min-w-0 truncate text-[13px] text-[var(--m-ink-2)]"
                            suppressHydrationWarning
                        >
                            {formatBuiltAt(plan.generatedAt)}
                            {plan.version ? (
                                <span className="m-num text-[var(--m-ink-3)]"> · v{plan.version}</span>
                            ) : null}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <LinkButton href="/member/train/profile" tone="quiet" size="sm">
                                Edit profile
                            </LinkButton>
                            <Button
                                tone="quiet"
                                size="sm"
                                onClick={build}
                                leadingIcon={<IconRefresh size={15} stroke={2} />}
                            >
                                Rebuild
                            </Button>
                        </div>
                    </div>
                ) : null}

                {plan.summary ? (
                    <p className="px-1 text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                        {plan.summary}
                    </p>
                ) : null}

                {/* Day picker. Overflows the gutter deliberately so the last chip
                    is visibly cut off, which signals scrollability without a hint. */}
                <div className="m-snap-x -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
                    {plan.sessions.map((item, i) => (
                        <button
                            key={`${item.day}-${i}`}
                            type="button"
                            onClick={() => setActive(i)}
                            aria-pressed={i === index}
                            className={cn(
                                'm-tap flex h-11 shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold',
                                i === index
                                    ? 'border-transparent bg-[var(--m-ink)] text-[var(--m-bg)]'
                                    : 'border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-ink-2)]',
                            )}
                        >
                            {item.day}
                        </button>
                    ))}
                </div>

                <Card className="overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                            <IconBarbell size={22} stroke={1.8} />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-[16.5px] font-semibold tracking-[-0.015em]">
                                {session.focus}
                            </p>
                            <p className="m-num text-[12px] text-[var(--m-ink-3)]">
                                {session.exercises.length} exercises
                            </p>
                        </div>
                    </div>

                    <ul className="m-divide border-t border-[var(--m-line-soft)]">
                        {session.exercises.map((exercise, index) => (
                            <li key={`${exercise.name}-${index}`} className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                    <span className="m-num mt-0.5 w-5 shrink-0 text-[12px] text-[var(--m-ink-3)]">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[14.5px] font-medium leading-snug">
                                            {exercise.name}
                                        </p>
                                        <p className="m-num mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-[var(--m-ink-2)]">
                                            <span>{exercise.sets} sets</span>
                                            <span>{exercise.reps} reps</span>
                                            <span>{exercise.restSeconds}s rest</span>
                                        </p>
                                        {exercise.notes ? (
                                            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--m-ink-3)]">
                                                {exercise.notes}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>

                <SectionHeading>Nutrition</SectionHeading>
                {plan.nutrition.hasPlan ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatTile
                            label="Calories"
                            value={plan.nutrition.calories ?? '-'}
                            unit="kcal"
                            emphasis
                        />
                        <StatTile label="Protein" value={plan.nutrition.protein ?? '-'} unit="g" />
                        <StatTile label="Carbs" value={plan.nutrition.carbs ?? '-'} unit="g" />
                        <StatTile label="Fat" value={plan.nutrition.fat ?? '-'} unit="g" />
                    </div>
                ) : (
                    <Card className="flex items-start gap-3 p-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--m-surface-2)] text-[var(--m-ink-2)]">
                            <IconApple size={21} stroke={1.7} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[14.5px] font-semibold">No nutrition targets set</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                                Daily calorie and macro targets appear here once your plan includes
                                them.
                            </p>
                        </div>
                    </Card>
                )}

                {aiTrainerEnabled ? <CoachCard /> : null}
            </Stack>
        </Screen>
    )
}

/* Shown in place of the rebuild row while the coach is writing. */
function BuildingCard() {
    return (
        <Card className="flex items-center gap-3 p-4" aria-live="polite">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--m-accent-wash)] text-[var(--m-accent-wash-ink)]">
                <IconSparkles size={21} stroke={1.7} className="animate-pulse" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold">Writing your new plan</p>
                <p className="mt-0.5 text-[12.5px] text-[var(--m-ink-3)]">
                    About half a minute. You can leave this screen and come back.
                </p>
            </div>
        </Card>
    )
}

function CoachCard() {
    return (
        <Card className="flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--m-surface-2)] text-[var(--m-ink-2)]">
                <IconMessageCircle size={21} stroke={1.7} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold">Ask the coach</p>
                <p className="mt-0.5 text-[12.5px] text-[var(--m-ink-3)]">
                    Form checks, swaps, rest-day questions
                </p>
            </div>
            <LinkButton href="/member/train/coach" tone="quiet" size="sm">
                Open
            </LinkButton>
        </Card>
    )
}

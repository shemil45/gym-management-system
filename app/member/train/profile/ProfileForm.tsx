'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IconArrowRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { Button, Card, Screen, SectionHeading, Stack } from '@/components/member/ui'
import { saveFitnessProfile } from '@/app/member/fitness-profile/actions'

/*
  Training profile.

  The questionnaire the coach reads before writing a plan. Choice fields are
  chip rows rather than selects so a thumb can answer most of it without the
  keyboard; only height, weight and injuries need typing, and those are
  optional. Saving hands off to the Train screen, which starts the build.
*/

export type FitnessProfileValues = {
    goal: string | null
    experience: string | null
    days_per_week: number | null
    dietary_preference: string | null
    injuries: string | null
    height_cm: number | null
    weight_kg: number | null
}

const GOALS = [
    { value: 'lose_weight', label: 'Lose weight' },
    { value: 'build_muscle', label: 'Build muscle' },
    { value: 'strength', label: 'Get stronger' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'general_fitness', label: 'General fitness' },
]

const EXPERIENCE = [
    { value: 'beginner', label: 'Beginner', hint: 'Under a year' },
    { value: 'intermediate', label: 'Intermediate', hint: '1 to 3 years' },
    { value: 'advanced', label: 'Advanced', hint: '3+ years' },
]

const DIETS = [
    { value: '', label: 'No restriction' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'eggetarian', label: 'Eggetarian' },
    { value: 'non_vegetarian', label: 'Non-vegetarian' },
]

const DAYS = [2, 3, 4, 5, 6]

function Chips<T extends string | number>({
    options,
    value,
    onChange,
    name,
}: {
    options: { value: T; label: string; hint?: string }[]
    value: T | null
    onChange: (next: T) => void
    name: string
}) {
    return (
        <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
            {options.map((option) => {
                const selected = option.value === value
                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'm-tap flex h-11 items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-semibold',
                            selected
                                ? 'border-transparent bg-[var(--m-ink)] text-[var(--m-bg)]'
                                : 'border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-ink-2)]',
                        )}
                    >
                        {option.label}
                        {option.hint ? (
                            <span
                                className={cn(
                                    'text-[11.5px] font-medium',
                                    selected ? 'opacity-70' : 'text-[var(--m-ink-3)]',
                                )}
                            >
                                {option.hint}
                            </span>
                        ) : null}
                    </button>
                )
            })}
        </div>
    )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-2.5">
            <div>
                <p className="text-[14px] font-semibold tracking-[-0.01em]">{label}</p>
                {hint ? <p className="mt-0.5 text-[12.5px] text-[var(--m-ink-3)]">{hint}</p> : null}
            </div>
            {children}
        </div>
    )
}

const INPUT =
    'h-12 w-full rounded-[var(--m-r-control)] border border-[var(--m-line)] bg-[var(--m-surface)] px-3.5 text-[15px] text-[var(--m-ink)] placeholder:text-[var(--m-ink-3)]'

export default function ProfileForm({
    initial,
    hasPlan,
}: {
    initial: Partial<FitnessProfileValues> | null
    hasPlan: boolean
}) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [goal, setGoal] = useState<string | null>(initial?.goal ?? null)
    const [experience, setExperience] = useState<string | null>(initial?.experience ?? null)
    const [days, setDays] = useState<number | null>(initial?.days_per_week ?? null)
    const [diet, setDiet] = useState<string>(initial?.dietary_preference ?? '')
    const [height, setHeight] = useState(initial?.height_cm ? String(initial.height_cm) : '')
    const [weight, setWeight] = useState(initial?.weight_kg ? String(initial.weight_kg) : '')
    const [injuries, setInjuries] = useState(initial?.injuries ?? '')

    function submit() {
        if (!goal || !experience || !days) {
            toast('Pick a goal, your experience and training days first')
            return
        }
        const form = new FormData()
        form.set('goal', goal)
        form.set('experience', experience)
        form.set('days_per_week', String(days))
        form.set('dietary_preference', diet)
        form.set('injuries', injuries.trim())
        form.set('height_cm', height.trim())
        form.set('weight_kg', weight.trim())

        startTransition(async () => {
            const result = await saveFitnessProfile(form)
            if (result?.error) {
                toast.error('Could not save your profile', { description: result.error })
                return
            }
            // The Train screen owns generation so the loading state lives next
            // to the plan it produces. `build=1` tells it to start straight away.
            router.push(hasPlan ? '/member/train' : '/member/train?build=1')
        })
    }

    return (
        <Screen title="Training profile">
            <Stack gap={14}>
                <p className="px-1 text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                    The coach uses this to write your weekly split and daily targets. You can
                    change it any time and rebuild.
                </p>

                <SectionHeading>About your training</SectionHeading>
                <Card className="flex flex-col gap-6 p-4">
                    <Field label="What are you training for?">
                        <Chips name="Goal" options={GOALS} value={goal} onChange={setGoal} />
                    </Field>
                    <Field label="How experienced are you?">
                        <Chips
                            name="Experience"
                            options={EXPERIENCE}
                            value={experience}
                            onChange={setExperience}
                        />
                    </Field>
                    <Field label="Days per week you can train">
                        <Chips
                            name="Days per week"
                            options={DAYS.map((d) => ({ value: d, label: `${d} days` }))}
                            value={days}
                            onChange={setDays}
                        />
                    </Field>
                </Card>

                <SectionHeading>About you</SectionHeading>
                <Card className="flex flex-col gap-6 p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-2">
                            <span className="text-[13px] font-medium text-[var(--m-ink-2)]">
                                Height (cm)
                            </span>
                            <input
                                type="number"
                                inputMode="decimal"
                                min={100}
                                max={250}
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                placeholder="170"
                                className={INPUT}
                            />
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-[13px] font-medium text-[var(--m-ink-2)]">
                                Weight (kg)
                            </span>
                            <input
                                type="number"
                                inputMode="decimal"
                                min={30}
                                max={300}
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="70"
                                className={INPUT}
                            />
                        </label>
                    </div>
                    <Field label="Diet" hint="Shapes the meal plan, not the workouts.">
                        <Chips name="Diet" options={DIETS} value={diet} onChange={setDiet} />
                    </Field>
                    <Field
                        label="Injuries or limits"
                        hint="Anything the coach should work around. Optional."
                    >
                        <textarea
                            value={injuries}
                            onChange={(e) => setInjuries(e.target.value)}
                            rows={3}
                            placeholder="e.g. Left knee, avoid deep squats"
                            className="w-full resize-none rounded-[var(--m-r-control)] border border-[var(--m-line)] bg-[var(--m-surface)] px-3.5 py-3 text-[15px] text-[var(--m-ink)] placeholder:text-[var(--m-ink-3)]"
                        />
                    </Field>
                </Card>

                <Button
                    tone="primary"
                    size="lg"
                    full
                    disabled={pending}
                    onClick={submit}
                    trailingIcon={<IconArrowRight size={16} stroke={2.2} />}
                >
                    {pending ? 'Saving' : hasPlan ? 'Save profile' : 'Save and build my plan'}
                </Button>
            </Stack>
        </Screen>
    )
}

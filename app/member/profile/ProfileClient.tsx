'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { IconLock } from '@tabler/icons-react'
import { Button, Card, Screen, SectionHeading, Stack } from '@/components/member/ui'
import { updateMemberContactDetails } from './actions'

/*
  Editing is limited to what a member actually owns: contact details. Plan,
  dates and status are shown read-only with a reason, so a member is never left
  tapping a field that will not save.
*/

function Field({
    label,
    name,
    defaultValue,
    type = 'text',
    placeholder,
    error,
    inputMode,
}: {
    label: string
    name: string
    defaultValue?: string | null
    type?: string
    placeholder?: string
    error?: string
    inputMode?: 'tel' | 'text'
}) {
    return (
        <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-[var(--m-ink-2)]">{label}</span>
            <input
                name={name}
                type={type}
                inputMode={inputMode}
                defaultValue={defaultValue ?? ''}
                placeholder={placeholder}
                aria-invalid={error ? true : undefined}
                className="h-12 rounded-[var(--m-r-control)] border border-[var(--m-line)] bg-[var(--m-surface)] px-3.5 text-[15px] text-[var(--m-ink)] placeholder:text-[var(--m-ink-3)]"
            />
            {error ? (
                <span className="text-[12.5px] text-[var(--m-danger)]">{error}</span>
            ) : null}
        </label>
    )
}

export default function ProfileClient({
    member,
}: {
    member: {
        fullName: string
        memberCode: string
        email: string | null
        phone: string | null
        address: string | null
        emergencyName: string | null
        emergencyPhone: string | null
        planName: string | null
    }
}) {
    const [pending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function onSubmit(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await updateMemberContactDetails(formData)
            if (result.ok) {
                toast.success('Details updated')
            } else {
                setError(result.error)
                toast.error(result.error)
            }
        })
    }

    return (
        <Screen title="Profile">
            <form action={onSubmit}>
                <Stack gap={14}>
                    <SectionHeading>Contact</SectionHeading>
                    <Card className="p-4">
                        <Stack gap={14}>
                            <Field
                                label="Phone"
                                name="phone"
                                type="tel"
                                inputMode="tel"
                                defaultValue={member.phone}
                                placeholder="+91 98765 43210"
                                error={error ?? undefined}
                            />
                            <Field
                                label="Address"
                                name="address"
                                defaultValue={member.address}
                                placeholder="Street, area, city"
                            />
                        </Stack>
                    </Card>

                    <SectionHeading>Emergency contact</SectionHeading>
                    <Card className="p-4">
                        <Stack gap={14}>
                            <Field
                                label="Name"
                                name="emergency_contact_name"
                                defaultValue={member.emergencyName}
                                placeholder="Who should we call"
                            />
                            <Field
                                label="Phone"
                                name="emergency_contact_phone"
                                type="tel"
                                inputMode="tel"
                                defaultValue={member.emergencyPhone}
                                placeholder="+91 98765 43210"
                            />
                        </Stack>
                    </Card>

                    <SectionHeading>Managed by the gym</SectionHeading>
                    <Card className="m-divide overflow-hidden">
                        {[
                            ['Name', member.fullName],
                            ['Member code', member.memberCode],
                            ['Email', member.email ?? 'Not set'],
                            ['Plan', member.planName ?? 'None'],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                className="flex min-h-[52px] items-center gap-3 px-4 py-3"
                            >
                                <span className="flex-1 text-[14px] text-[var(--m-ink-2)]">
                                    {label}
                                </span>
                                <span className="truncate text-[14px] font-medium">{value}</span>
                                <IconLock
                                    size={15}
                                    stroke={1.7}
                                    className="shrink-0 text-[var(--m-ink-3)]"
                                />
                            </div>
                        ))}
                    </Card>

                    <Button type="submit" tone="primary" full disabled={pending} className="mt-1">
                        {pending ? 'Saving' : 'Save changes'}
                    </Button>
                </Stack>
            </form>
        </Screen>
    )
}

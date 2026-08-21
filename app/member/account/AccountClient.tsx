'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    IconBell,
    IconDeviceDesktop,
    IconGift,
    IconLifebuoy,
    IconLogout,
    IconMoon,
    IconReceipt,
    IconSun,
    IconUser,
} from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { useMemberTheme } from '@/components/member/MemberTheme'
import { Card, Row, RowGroup, Screen, SectionHeading, Stack } from '@/components/member/ui'

const MODES = [
    { key: 'light', label: 'Light', icon: IconSun },
    { key: 'dark', label: 'Dark', icon: IconMoon },
    { key: 'system', label: 'Auto', icon: IconDeviceDesktop },
] as const

export default function AccountClient({
    name,
    memberCode,
    email,
    phone,
    photoUrl,
    joinedAt,
    credits,
}: {
    name: string
    memberCode: string
    email: string | null
    phone: string | null
    photoUrl: string | null
    joinedAt: string | null
    credits: number
}) {
    const router = useRouter()
    const { mode, setMode } = useMemberTheme()
    const [signingOut, setSigningOut] = useState(false)

    async function signOut() {
        setSigningOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()

    return (
        <Screen title="Account">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <Stack gap={14}>
                    <Card className="flex items-center gap-4 p-4">
                        {photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={photoUrl}
                                alt=""
                                className="h-14 w-14 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--m-ink)] text-[16px] font-semibold text-[var(--m-bg)]">
                                {initials}
                            </span>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-[17px] font-semibold tracking-[-0.02em]">
                                {name}
                            </p>
                            <p className="m-num mt-0.5 truncate text-[12.5px] text-[var(--m-ink-3)]">
                                {memberCode}
                            </p>
                            {joinedAt ? (
                                <p className="mt-0.5 truncate text-[12px] text-[var(--m-ink-3)]">
                                    Member since{' '}
                                    {new Date(joinedAt).toLocaleDateString('en-IN', {
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                            ) : null}
                        </div>
                    </Card>

                    <SectionHeading>Details</SectionHeading>
                    <RowGroup>
                        <Row label="Email" value={email ?? 'Not set'} />
                        <Row label="Phone" value={phone ?? 'Not set'} />
                        <Row
                            href="/member/profile"
                            icon={<IconUser size={18} stroke={1.7} />}
                            label="Edit my details"
                        />
                    </RowGroup>

                    <SectionHeading>Appearance</SectionHeading>
                    <Card className="p-3">
                        <div
                            role="radiogroup"
                            aria-label="Theme"
                            className="grid grid-cols-3 gap-2"
                        >
                            {MODES.map((option) => {
                                const Icon = option.icon
                                const active = mode === option.key
                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => setMode(option.key)}
                                        className={cn(
                                            'm-tap flex h-[52px] flex-col items-center justify-center gap-1 rounded-[var(--m-r-control)] border text-[12px] font-medium',
                                            active
                                                ? 'border-[var(--m-ink)] bg-[var(--m-surface-2)] font-semibold'
                                                : 'border-[var(--m-line)]',
                                        )}
                                    >
                                        <Icon size={18} stroke={1.8} />
                                        {option.label}
                                    </button>
                                )
                            })}
                        </div>
                    </Card>
                </Stack>

                <Stack gap={14}>
                    <SectionHeading>Portal</SectionHeading>
                    <RowGroup>
                        <Row
                            href="/member/notifications"
                            icon={<IconBell size={18} stroke={1.7} />}
                            label="Notifications"
                        />
                        <Row
                            href="/member/payments"
                            icon={<IconReceipt size={18} stroke={1.7} />}
                            label="Payments and receipts"
                        />
                        <Row
                            href="/member/referrals"
                            icon={<IconGift size={18} stroke={1.7} />}
                            label="Refer a friend"
                            value={String(credits)}
                        />
                        <Row
                            href="/member/support"
                            icon={<IconLifebuoy size={18} stroke={1.7} />}
                            label="Help and contact"
                        />
                    </RowGroup>

                    <RowGroup>
                        <Row
                            icon={<IconLogout size={18} stroke={1.7} />}
                            label={signingOut ? 'Signing out' : 'Sign out'}
                            tone="danger"
                            onClick={signOut}
                        />
                    </RowGroup>
                </Stack>
            </div>
        </Screen>
    )
}

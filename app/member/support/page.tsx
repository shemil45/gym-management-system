import {
    IconBrandWhatsapp,
    IconChevronDown,
    IconMail,
    IconPhone,
} from '@tabler/icons-react'
import { getCurrentMemberContext } from '@/lib/auth/member-server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Card, Screen, SectionHeading, Stack } from '@/components/member/ui'

export const metadata = { title: 'Help' }

const FAQS = [
    {
        q: 'How do I check in at the door?',
        a: 'Open Pass from the bar at the bottom of the screen and hold the code up to the scanner. It works without a connection, so a weak signal in the lobby is not a problem.',
    },
    {
        q: 'My membership expired. Can I still train today?',
        a: 'No. The pass stops working the day after your plan ends. Renew from the Plan tab and access comes back immediately once the payment is recorded.',
    },
    {
        q: 'Can I pause my membership?',
        a: 'Yes, holds are arranged with the front desk so your unused days are carried over correctly. Call or message us and we will set it up.',
    },
    {
        q: 'Where are my receipts?',
        a: 'Every recorded payment appears under Payments with a receipt you can open and save.',
    },
    {
        q: 'How do referral credits work?',
        a: 'Share your member code. When a friend joins with it, credits land in your balance and come off your next renewal.',
    },
]

export default async function SupportPage() {
    const { gym } = await getCurrentMemberContext()

    let phone: string | null = null
    let email: string | null = null

    if (gym) {
        const { data } = (await getSupabaseAdmin()
            .from('gyms')
            .select('contact_phone, contact_email')
            .eq('id', gym.id)
            .maybeSingle()) as {
            data: { contact_phone: string | null; contact_email: string | null } | null
        }
        phone = data?.contact_phone ?? null
        email = data?.contact_email ?? null
    }

    const digits = phone?.replace(/\D/g, '') ?? null

    return (
        <Screen title="Help">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <Stack gap={14}>
                    <SectionHeading>Common questions</SectionHeading>
                    <Card className="m-divide overflow-hidden">
                        {FAQS.map((faq) => (
                            <details key={faq.q} className="group">
                                <summary className="m-tap flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                                    <span className="flex-1 text-[14.5px] font-medium leading-snug">
                                        {faq.q}
                                    </span>
                                    <IconChevronDown
                                        size={18}
                                        stroke={1.8}
                                        className="shrink-0 text-[var(--m-ink-3)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-180"
                                    />
                                </summary>
                                <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                                    {faq.a}
                                </p>
                            </details>
                        ))}
                    </Card>
                </Stack>

                <Stack gap={14}>
                    <SectionHeading>Reach the gym</SectionHeading>
                    {phone || email ? (
                        <Card className="m-divide overflow-hidden">
                            {phone ? (
                                <a
                                    href={`tel:${phone}`}
                                    className="m-tap flex min-h-[56px] items-center gap-3 px-4"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--m-surface-2)] text-[var(--m-ink-2)]">
                                        <IconPhone size={18} stroke={1.7} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[14.5px] font-medium">Call</span>
                                        <span className="m-num block truncate text-[12.5px] text-[var(--m-ink-3)]">
                                            {phone}
                                        </span>
                                    </span>
                                </a>
                            ) : null}
                            {digits ? (
                                <a
                                    href={`https://wa.me/${digits}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="m-tap flex min-h-[56px] items-center gap-3 px-4"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--m-surface-2)] text-[var(--m-ink-2)]">
                                        <IconBrandWhatsapp size={18} stroke={1.7} />
                                    </span>
                                    <span className="text-[14.5px] font-medium">WhatsApp</span>
                                </a>
                            ) : null}
                            {email ? (
                                <a
                                    href={`mailto:${email}`}
                                    className="m-tap flex min-h-[56px] items-center gap-3 px-4"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--m-surface-2)] text-[var(--m-ink-2)]">
                                        <IconMail size={18} stroke={1.7} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[14.5px] font-medium">
                                            Email
                                        </span>
                                        <span className="block truncate text-[12.5px] text-[var(--m-ink-3)]">
                                            {email}
                                        </span>
                                    </span>
                                </a>
                            ) : null}
                        </Card>
                    ) : (
                        <Card className="px-5 py-8 text-center">
                            <p className="text-[14.5px] font-semibold">No contact details yet</p>
                            <p className="mx-auto mt-1.5 max-w-[32ch] text-[13px] leading-relaxed text-[var(--m-ink-2)]">
                                {gym?.name ?? 'Your gym'} has not published a phone number or email.
                                Ask at the front desk.
                            </p>
                        </Card>
                    )}
                </Stack>
            </div>
        </Screen>
    )
}

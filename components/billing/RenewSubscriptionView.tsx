'use client'

import Link from 'next/link'
import {
    IconArrowRight,
    IconBellRinging,
    IconCalendarOff,
    IconCreditCard,
    IconDeviceMobile,
    IconLock,
    IconReceipt2,
    IconShieldCheck,
    IconUserShield,
    IconUsers,
} from '@tabler/icons-react'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import type { SubscriptionState } from '@/lib/billing/subscription'

/**
 * The page a lapsed tenant lands on when they open a gated section.
 *
 * Reads at admin scale - one statement, the renew action in reach without
 * scrolling - but with the same layered surfaces as the rest of the
 * dashboard: a headline panel with a subscription summary card beside it,
 * then the list of closed areas.
 */

type Props = {
    state: SubscriptionState
    gymName: string
    planName: string | null
    lapsedOn: string | null
    supportEmail: string
}

const HEADLINES: Partial<Record<SubscriptionState, string>> = {
    trial_expired: 'Your free trial has ended',
    cancelled: 'Your subscription is cancelled',
    paused: 'Your subscription is paused',
}

const STATUS_LABEL: Partial<Record<SubscriptionState, string>> = {
    trial_expired: 'Trial ended',
    cancelled: 'Cancelled',
    paused: 'Paused',
}

const RESTRICTED = [
    {
        icon: IconUsers,
        title: 'Member Management',
        body: 'Manage members, memberships, profiles, and member records.',
    },
    {
        icon: IconCreditCard,
        title: 'Payment Management',
        body: 'Record, track, and manage member payments.',
    },
    {
        icon: IconReceipt2,
        title: 'Expense Management',
        body: 'Track and manage your gym’s expenses and financial records.',
    },
    {
        icon: IconUserShield,
        title: 'Staff Management',
        body: 'Manage staff accounts, roles, and access permissions.',
    },
    {
        icon: IconBellRinging,
        title: 'Notifications',
        body: 'Send and receive important notifications and updates.',
    },
    {
        icon: IconDeviceMobile,
        title: 'Member Portal',
        body: 'Your members cannot access their member portal until the subscription is renewed.',
    },
]

const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]'

function formatDate(value: string | null) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysSince(value: string | null) {
    if (!value) return null
    const time = new Date(value).getTime()
    if (Number.isNaN(time)) return null
    return Math.max(0, Math.floor((Date.now() - time) / 86_400_000))
}

export default function RenewSubscriptionView({ state, gymName, planName, lapsedOn, supportEmail }: Props) {
    const { isDark } = useAdminTheme()
    const headline = HEADLINES[state] ?? 'Your subscription has expired'
    const statusLabel = STATUS_LABEL[state] ?? 'Expired'
    const lapsedDate = formatDate(lapsedOn)
    const days = daysSince(lapsedOn)

    // The admin shell paints its own ground, so every surface declares its
    // own colour instead of inheriting one.
    const t = isDark
        ? {
              ink: 'text-zinc-50',
              ink2: 'text-zinc-400',
              ink3: 'text-zinc-500',
              // Outer shells sit on the shell ground; inner cores sit on the shells.
              shell: 'bg-zinc-900/70 ring-1 ring-inset ring-white/[0.07]',
              core: 'bg-zinc-950/60 ring-1 ring-inset ring-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
              dots: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
              hairline: 'border-white/[0.06]',
              divide: 'divide-white/[0.06]',
              row: 'hover:bg-white/[0.025]',
              status: 'bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/25',
              statusDot: 'bg-red-400',
              iconWell: 'bg-white/[0.06] text-zinc-100 ring-1 ring-inset ring-white/[0.08]',
              lockWell: 'bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/20',
              lockPill: 'bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/20',
              panelHead: 'bg-white/[0.03]',
              primary: 'bg-zinc-50 text-zinc-950 hover:bg-white shadow-[0_8px_20px_-10px_rgba(255,255,255,0.35)]',
              secondary: 'text-zinc-200 ring-1 ring-inset ring-white/[0.12] hover:bg-white/[0.04]',
              summaryLabel: 'text-zinc-500',
              summaryValue: 'text-zinc-100',
              safe: 'bg-emerald-500/[0.06] text-emerald-200/80',
              safeIcon: 'bg-emerald-500/15 text-emerald-300',
              safeStrong: 'text-emerald-100',
              count: 'bg-white/[0.06] text-zinc-300 ring-1 ring-inset ring-white/[0.07]',
          }
        : {
              ink: 'text-zinc-900',
              ink2: 'text-zinc-600',
              ink3: 'text-zinc-500',
              shell: 'bg-zinc-50 ring-1 ring-inset ring-zinc-200/80',
              core: 'bg-white ring-1 ring-inset ring-zinc-200 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_16px_40px_-24px_rgba(24,24,27,0.25)]',
              dots: 'radial-gradient(rgba(24,24,27,0.09) 1px, transparent 1px)',
              hairline: 'border-zinc-200',
              divide: 'divide-zinc-200',
              row: 'hover:bg-zinc-50',
              status: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
              statusDot: 'bg-red-500',
              iconWell: 'bg-zinc-100 text-zinc-800 ring-1 ring-inset ring-zinc-200/70',
              lockWell: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-100',
              lockPill: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/80',
              panelHead: 'bg-zinc-50/80',
              primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-[0_10px_24px_-12px_rgba(24,24,27,0.6)]',
              secondary: 'bg-white text-zinc-800 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50',
              summaryLabel: 'text-zinc-500',
              summaryValue: 'text-zinc-900',
              safe: 'bg-emerald-50/60 text-emerald-900/75',
              safeIcon: 'bg-white text-emerald-600 ring-1 ring-inset ring-emerald-200',
              safeStrong: 'text-emerald-950',
              count: 'bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200',
          }

    return (
        <div className={`mx-auto w-full max-w-5xl pb-10 pt-1 sm:pt-2 ${t.ink}`}>
            {/* Headline panel: statement + actions on the left, subscription summary on the right. */}
            <section
                className={`renew-reveal relative overflow-hidden rounded-2xl p-1.5 ${t.shell}`}
                style={{ animationDelay: '40ms' }}
            >
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
                    style={{ backgroundImage: t.dots, backgroundSize: '18px 18px' }}
                />

                <div className="relative grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 lg:p-7">
                    <div className="min-w-0">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${t.status}`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${t.statusDot}`} />
                            Access restricted
                        </span>

                        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-[28px] sm:leading-tight">
                            {headline}
                        </h1>

                        <p className={`mt-2.5 max-w-[58ch] text-[14.5px] leading-relaxed ${t.ink2}`}>
                            Your GMSCloud subscription is no longer active, so access to your workspace has been
                            temporarily restricted.{' '}
                            <span className={`font-medium ${t.ink}`}>Renew your subscription to restore full access</span>{' '}
                            to your gym management tools and member services.
                        </p>

                        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                            <Link
                                href="/admin/settings/subscription"
                                className={`group inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-[13.5px] font-medium transition-all duration-300 ${EASE} hover:-translate-y-px active:translate-y-0 active:scale-[0.98] ${t.primary}`}
                            >
                                Renew Subscription
                                <IconArrowRight
                                    size={15}
                                    stroke={1.75}
                                    className={`transition-transform duration-300 ${EASE} group-hover:translate-x-0.5`}
                                />
                            </Link>
                            <a
                                href={`mailto:${supportEmail}`}
                                className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-[13.5px] font-medium transition-all duration-300 ${EASE} active:scale-[0.98] ${t.secondary}`}
                            >
                                Contact Support
                            </a>
                        </div>
                    </div>

                    {/* Summary card */}
                    <aside
                        className={`renew-reveal rounded-xl p-4 ${t.core}`}
                        style={{ animationDelay: '160ms' }}
                        aria-label="Subscription summary"
                    >
                        <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.lockWell}`}>
                                <IconCalendarOff size={17} stroke={1.5} />
                            </span>
                            <div className="min-w-0">
                                <p className={`text-[11px] font-medium uppercase tracking-[0.12em] ${t.summaryLabel}`}>
                                    Subscription
                                </p>
                                <p className={`truncate text-[13.5px] font-semibold ${t.summaryValue}`}>{gymName}</p>
                            </div>
                        </div>

                        <dl className={`mt-4 divide-y ${t.divide} text-[13px]`}>
                            <div className="flex items-center justify-between py-2">
                                <dt className={t.summaryLabel}>Status</dt>
                                <dd className={`inline-flex items-center gap-1.5 font-medium ${t.summaryValue}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${t.statusDot}`} />
                                    {statusLabel}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <dt className={t.summaryLabel}>Plan</dt>
                                <dd className={`font-medium ${t.summaryValue}`}>{planName ?? '—'}</dd>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <dt className={t.summaryLabel}>Ended</dt>
                                <dd className={`font-medium tabular-nums ${t.summaryValue}`}>{lapsedDate ?? '—'}</dd>
                            </div>
                            {days !== null ? (
                                <div className="flex items-center justify-between py-2">
                                    <dt className={t.summaryLabel}>Inactive for</dt>
                                    <dd className={`font-medium tabular-nums ${t.summaryValue}`}>
                                        {days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`}
                                    </dd>
                                </div>
                            ) : null}
                        </dl>

                        <p className={`mt-3 text-[12px] leading-relaxed ${t.ink3}`}>
                            Access is restored the moment a renewal payment goes through.
                        </p>
                    </aside>
                </div>
            </section>

            {/* What is closed. One core panel, rows separated by hairlines. */}
            <section
                className={`renew-reveal mt-5 overflow-hidden rounded-xl ${t.core}`}
                style={{ animationDelay: '220ms' }}
            >
                <div className={`flex items-center justify-between border-b px-5 py-3 ${t.hairline} ${t.panelHead}`}>
                    <div className="flex items-center gap-2.5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${t.lockWell}`}>
                            <IconLock size={14} stroke={1.75} />
                        </span>
                        <h2 className="text-[13.5px] font-semibold tracking-tight">What&rsquo;s currently restricted?</h2>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${t.count}`}>
                        {RESTRICTED.length} areas
                    </span>
                </div>

                <ul className={`divide-y ${t.divide} lg:grid lg:grid-cols-2 lg:divide-y-0`}>
                    {RESTRICTED.map((item, index) => {
                        const Icon = item.icon
                        // On two columns, hairlines run between rows and down the
                        // middle; the last row and the right column drop theirs.
                        const rowBorder = index < RESTRICTED.length - 2 ? `lg:border-b ${t.hairline}` : ''
                        const colBorder = index % 2 === 0 ? `lg:border-r ${t.hairline}` : ''
                        return (
                            <li
                                key={item.title}
                                className={`renew-reveal flex items-start gap-3.5 px-5 py-4 transition-colors duration-200 ${rowBorder} ${colBorder} ${t.row}`}
                                style={{ animationDelay: `${280 + index * 50}ms` }}
                            >
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconWell}`}>
                                    <Icon size={18} stroke={1.5} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[13.5px] font-semibold tracking-tight">{item.title}</p>
                                        <span
                                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] ${t.lockPill}`}
                                        >
                                            <IconLock size={10} stroke={2} />
                                            Locked
                                        </span>
                                    </div>
                                    <p className={`mt-0.5 text-[12.5px] leading-relaxed ${t.ink2}`}>{item.body}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>

                <div className={`flex items-start gap-3 border-t px-5 py-3.5 text-[12.5px] leading-relaxed ${t.hairline} ${t.safe}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${t.safeIcon}`}>
                        <IconShieldCheck size={15} stroke={1.5} />
                    </span>
                    <p className="pt-0.5">
                        <span className={`font-medium ${t.safeStrong}`}>Your data is safe.</span> Your existing members,
                        payments, expenses, staff records, and other data are securely retained. Nothing has been
                        deleted.
                    </p>
                </div>
            </section>

            <p className={`renew-reveal mt-4 text-[12px] ${t.ink3}`} style={{ animationDelay: '640ms' }}>
                Need help with your subscription? Write to {supportEmail}.
            </p>
        </div>
    )
}

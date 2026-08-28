'use client'

import Link from 'next/link'
import {
    Bell,
    Building2,
    ChevronRight,
    CreditCard,
    Receipt,
    Tag,
    User,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'

interface SettingsCard {
    title: string
    description: string
    href: string
    icon: React.ReactNode
}

interface SettingsCategory {
    label: string
    cards: SettingsCard[]
}

const CATEGORIES: SettingsCategory[] = [
    {
        label: 'General',
        cards: [
            {
                title: 'Gym Profile',
                description: 'Name, logo, address, and contact details for your gym.',
                href: '/admin/settings/gym-profile',
                icon: <Building2 className="h-4 w-4" />,
            },
            {
                title: 'Membership & Fees',
                description: 'Admission fees and default membership terms.',
                href: '/admin/settings/membership-fees',
                icon: <Tag className="h-4 w-4" />,
            },
        ],
    },
    {
        label: 'Billing',
        cards: [
            {
                title: 'Billing & Subscription',
                description: 'Your GMS Cloud plan, usage, invoices, and renewals.',
                href: '/admin/settings/subscription',
                icon: <CreditCard className="h-4 w-4" />,
            },
            {
                title: 'Invoice & Receipt',
                description: 'Invoice numbering, branding, and receipt templates.',
                href: '/admin/settings/invoice-receipt',
                icon: <Receipt className="h-4 w-4" />,
            },
            {
                title: 'Payment Settings',
                description: 'Accepted payment methods and provider configuration.',
                href: '/admin/settings/payment-settings',
                icon: <Wallet className="h-4 w-4" />,
            },
        ],
    },
    {
        label: 'Operations',
        cards: [
            {
                title: 'Member Settings',
                description: 'Member ID format and default onboarding preferences.',
                href: '/admin/settings/member-settings',
                icon: <Users className="h-4 w-4" />,
            },
            {
                title: 'Check-in & Attendance',
                description: 'Check-in rules and attendance tracking preferences.',
                href: '/admin/settings/check-in-attendance',
                icon: <UserCheck className="h-4 w-4" />,
            },
            {
                title: 'Notifications',
                description: 'Reminders and alerts sent to members and staff.',
                href: '/admin/settings/notifications',
                icon: <Bell className="h-4 w-4" />,
            },
        ],
    },
    {
        label: 'Account',
        cards: [
            {
                title: 'My Account',
                description: 'Your personal info, role, and password.',
                href: '/admin/settings/account',
                icon: <User className="h-4 w-4" />,
            },
        ],
    },
]

export default function SettingsHub() {
    const { isDark } = useAdminTheme()

    return (
        <div className="space-y-6">
            <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
                <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Configure your gym, memberships, payments, and account preferences.
                </p>
            </div>

            <div className="space-y-6">
                {CATEGORIES.map((category) => (
                    <section key={category.label}>
                        <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {category.label}
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {category.cards.map((card) => (
                                <Link
                                    key={card.href}
                                    href={card.href}
                                    className={`flex items-start gap-3 rounded-xl px-4 py-4 transition-all hover:-translate-y-0.5 ${
                                        isDark
                                            ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)] hover:border-[#3a3a3a]'
                                            : 'border border-[#e7e9ee] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)] hover:border-[#d9dde5] hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)]'
                                    }`}
                                >
                                    <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                            isDark ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-blue-50 text-blue-600'
                                        }`}
                                    >
                                        {card.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.title}</p>
                                        <p className={`mt-0.5 text-xs leading-snug ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                            {card.description}
                                        </p>
                                    </div>
                                    <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? 'text-zinc-600' : 'text-slate-300'}`} />
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}

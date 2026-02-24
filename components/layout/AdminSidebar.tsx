'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
    LayoutDashboard,
    Users,
    UserCheck,
    CreditCard,
    TrendingUp,
    Settings,
    Dumbbell,
    FileBarChart,
    LayoutList,
} from 'lucide-react'

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/admin/members', icon: Users },
    { name: 'Check-ins', href: '/admin/check-ins', icon: UserCheck },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Plans', href: '/admin/plans', icon: LayoutList },
    { name: 'Financial', href: '/admin/financial', icon: TrendingUp },
    { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminSidebar() {
    const pathname = usePathname()

    return (
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[100px] lg:flex-col xl:w-[110px]">
            <div
                className="flex grow flex-col overflow-y-auto pb-4"
                style={{ background: 'linear-gradient(180deg, #1a1f2e 0%, #141824 100%)' }}
            >
                {/* Logo */}
                <div className="flex h-16 shrink-0 flex-col items-center justify-center gap-1 px-2 mt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
                        <Dumbbell className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-white tracking-wide">GymFit</span>
                    <span className="text-[9px] text-slate-400">Management</span>
                </div>

                {/* Divider */}
                <div className="mx-4 h-px bg-white/10 mb-4" />

                {/* Navigation */}
                <nav className="flex flex-1 flex-col px-2">
                    <ul role="list" className="flex flex-1 flex-col gap-y-1">
                        {navigation.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                pathname?.startsWith(item.href + '/')
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            'group flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                                : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                        )}
                                    >
                                        <item.icon
                                            className={cn(
                                                'h-5 w-5 shrink-0 transition-colors',
                                                isActive
                                                    ? 'text-white'
                                                    : 'text-slate-400 group-hover:text-white'
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className="text-center leading-tight">{item.name}</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="px-2 pt-4 border-t border-white/10">
                    <p className="text-center text-[9px] text-slate-500">© 2026 GymFit</p>
                    <p className="text-center text-[9px] text-slate-600">Version 1.0.0</p>
                </div>
            </div>
        </div>
    )
}

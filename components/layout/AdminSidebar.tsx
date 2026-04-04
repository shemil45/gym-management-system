'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { useSidebar } from '@/components/layout/SidebarContext'
import {
    CreditCard,
    Dumbbell,
    FileBarChart,
    LayoutDashboard,
    LayoutList,
    LogOut,
    Settings,
    TrendingUp,
    UserCheck,
    Users,
    X,
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

function SidebarContent({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname()
    const router = useRouter()
    const isMobile = Boolean(onClose)

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        onClose?.()
        router.push('/login')
        router.refresh()
    }

    return (
        <div
            className="flex h-full grow flex-col overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden"
            style={{
                scrollbarWidth: 'none',
                background: isMobile
                    ? 'linear-gradient(180deg, #0f5be1 0%, #0c4ec6 100%)'
                    : 'linear-gradient(180deg, #1a1f2e 0%, #141824 100%)',
            }}
        >
            <div className="relative mt-4 flex shrink-0 flex-col px-4">
                <div className={cn('flex items-start', isMobile ? 'justify-between' : 'justify-center')}>
                    <div className={cn('flex', isMobile ? 'items-center gap-3' : 'flex-col items-center gap-1')}>
                        <div
                            className={cn(
                                'flex items-center justify-center shadow-lg',
                                isMobile
                                    ? 'h-11 w-11 rounded-2xl bg-white/15 shadow-blue-900/20'
                                    : 'h-9 w-9 rounded-lg bg-blue-600 shadow-blue-600/30'
                            )}
                        >
                            <Dumbbell className="h-5 w-5 text-white" />
                        </div>
                        <div className={cn('min-w-0', isMobile ? '' : 'text-center')}>
                            <span className={cn('block font-bold tracking-wide text-white', isMobile ? 'text-base' : 'text-[11px]')}>
                                GymFit
                            </span>
                            <span className={cn(isMobile ? 'text-xs text-blue-100/80' : 'text-[9px] text-slate-400')}>
                                Management
                            </span>
                        </div>
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                            aria-label="Close sidebar"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

            </div>

            <div className={cn('mb-4 mt-4 h-px', isMobile ? 'mx-4 bg-white/15' : 'mx-4 bg-white/10')} />

            <nav className={cn('flex flex-1 flex-col', isMobile ? 'px-4' : 'px-2')}>
                <ul role="list" className={cn('flex flex-1 flex-col', isMobile ? 'gap-y-2' : 'gap-y-1')}>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    onClick={onClose}
                                    className={cn(
                                        'group transition-all duration-200',
                                        isMobile
                                            ? 'flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium'
                                            : 'flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium',
                                        isActive
                                            ? isMobile
                                                ? 'bg-white text-blue-700 shadow-xl shadow-blue-900/20'
                                                : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                            : isMobile
                                                ? 'text-white/85 hover:bg-white/10 hover:text-white'
                                                : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            'h-5 w-5 shrink-0 transition-colors',
                                            isActive
                                                ? isMobile
                                                    ? 'text-blue-700'
                                                    : 'text-white'
                                                : isMobile
                                                    ? 'text-white/75 group-hover:text-white'
                                                    : 'text-slate-400 group-hover:text-white'
                                        )}
                                        aria-hidden="true"
                                    />
                                    <span className={cn('leading-tight', isMobile ? 'text-left' : 'text-center')}>{item.name}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            <div className={cn('border-t pt-4', isMobile ? 'mx-4 border-white/15 px-2' : 'border-white/10 px-2')}>
                {isMobile ? (
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                    </button>
                ) : null}
                <p className={cn('text-center', isMobile ? 'text-[10px] text-blue-100/80' : 'text-[9px] text-slate-500')}>
                    © 2026 GymFit
                </p>
                <p className={cn('text-center', isMobile ? 'text-[10px] text-blue-100/60' : 'text-[9px] text-slate-600')}>
                    Version 1.0.0
                </p>
            </div>
        </div>
    )
}

export default function AdminSidebar() {
    const { isOpen, close } = useSidebar()

    return (
        <>
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[100px] lg:flex-col xl:w-[110px]">
                <SidebarContent />
            </div>

            <div
                className={cn(
                    'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
                    isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                )}
                onClick={close}
                aria-hidden="true"
            />

            <div
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-[18rem] max-w-[86vw] flex-col transition-transform duration-300 ease-in-out lg:hidden',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <SidebarContent onClose={close} />
            </div>
        </>
    )
}

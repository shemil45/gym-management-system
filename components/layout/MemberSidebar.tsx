'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useSidebar } from '@/components/layout/SidebarContext'
import {
    LayoutDashboard,
    UserCheck,
    Receipt,
    Gift,
    User,
    HelpCircle,
    Dumbbell,
    ClipboardList,
    MessageSquare,
    Zap,
    Salad,
    TrendingUp,
    Activity,
    X,
} from 'lucide-react'

const gymNav = [
    { name: 'Home', href: '/member/dashboard', icon: LayoutDashboard },
    { name: 'Check-ins', href: '/member/check-ins', icon: UserCheck },
    { name: 'Plans', href: '/member/plans', icon: ClipboardList },
    { name: 'Payments', href: '/member/payments', icon: Receipt },
    { name: 'Referrals', href: '/member/referrals', icon: Gift },
    { name: 'Profile', href: '/member/profile', icon: User },
    { name: 'Support', href: '/member/support', icon: HelpCircle },
]

const aiNav = [
    { name: 'AI Trainer', href: '/member/ai-trainer', icon: MessageSquare },
    { name: 'Workout', href: '/member/workout', icon: Zap },
    { name: 'Nutrition', href: '/member/nutrition', icon: Salad },
    { name: 'Progress', href: '/member/progress', icon: TrendingUp },
    { name: 'Fit Profile', href: '/member/fitness-profile', icon: Activity },
]

function NavItem({ href, icon: Icon, name, onClose }: { href: string; icon: React.ElementType; name: string; onClose?: () => void }) {
    const pathname = usePathname()
    const isActive = pathname === href || pathname?.startsWith(href + '/')
    return (
        <li>
            <Link
                href={href}
                onClick={onClose}
                className={cn(
                    'group flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium transition-all duration-200',
                    isActive
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                )}
            >
                <Icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} aria-hidden="true" />
                <span className="text-center leading-tight">{name}</span>
            </Link>
        </li>
    )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
    return (
        <div
            className="flex grow flex-col overflow-y-auto pb-4 h-full [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', background: 'linear-gradient(180deg, #0f2027 0%, #1a1f2e 100%)' }}
        >
            {/* Logo */}
            <div className="flex h-16 shrink-0 flex-col items-center justify-center gap-1 px-2 mt-4 relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/30">
                    <Dumbbell className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white tracking-wide">GymFit</span>
                <span className="text-[9px] text-slate-400">Member Portal</span>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-0 right-2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors lg:hidden"
                        aria-label="Close sidebar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-white/10 mb-4" />

            {/* Navigation */}
            <nav className="flex flex-1 flex-col px-2 gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden">

                {/* Gym Management */}
                <ul role="list" className="flex flex-col gap-y-1">
                    {gymNav.map(item => <NavItem key={item.name} {...item} onClose={onClose} />)}
                </ul>

                {/* AI Features section */}
                <div>
                    <p className="px-2 mb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">AI</p>
                    <div className="mx-2 h-px bg-white/10 mb-2" />
                    <ul role="list" className="flex flex-col gap-y-1">
                        {aiNav.map(item => <NavItem key={item.name} {...item} onClose={onClose} />)}
                    </ul>
                </div>

            </nav>

            {/* Footer */}
            <div className="px-2 pt-4 border-t border-white/10">
                <p className="text-center text-[9px] text-slate-500">© 2026 GymFit</p>
                <p className="text-center text-[9px] text-slate-600">Member Portal</p>
            </div>
        </div>
    )
}

export default function MemberSidebar() {
    const { isOpen, close } = useSidebar()

    return (
        <>
            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[100px] lg:flex-col xl:w-[110px]">
                <SidebarContent />
            </div>

            {/* Mobile backdrop */}
            <div
                className={cn(
                    'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                onClick={close}
                aria-hidden="true"
            />

            {/* Mobile drawer */}
            <div className={cn(
                'fixed inset-y-0 left-0 z-50 w-[110px] flex flex-col transition-transform duration-300 ease-in-out lg:hidden',
                isOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <SidebarContent onClose={close} />
            </div>
        </>
    )
}

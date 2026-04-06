'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Settings2, Sun, User } from 'lucide-react'
import { useSidebar } from '@/components/layout/SidebarContext'
import { formatRoleLabel } from '@/lib/auth/roles'

interface AdminHeaderProps {
    user: {
        email?: string
        full_name?: string
        photo_url?: string | null
        role?: string
    }
}

export default function AdminHeader({ user }: AdminHeaderProps) {
    const router = useRouter()
    const { toggle } = useSidebar()
    const { isDark, toggleTheme } = useAdminTheme()
    const headerSurface = isDark ? '#171717' : '#1266ea'

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const initials = user.full_name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'A'

    return (
        <header className={`sticky top-0 z-40 ${isDark ? 'border-b border-[#2a2a2a]' : 'border-b border-blue-500/30'}`}>
            <div
                className="flex h-16 items-center justify-between px-4 text-white lg:hidden"
                style={{ background: headerSurface }}
            >
                <button
                    onClick={toggle}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                        isDark
                            ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                            : 'bg-white/10 hover:bg-white/20'
                    }`}
                    aria-label="Open navigation"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0 px-3 text-center">
                    <p className="truncate text-lg font-semibold tracking-tight">FitGymSoftware</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className={`h-10 w-10 rounded-full text-white hover:text-white ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                                : 'bg-white/10 hover:bg-white/20'
                        }`}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>

                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full text-white hover:text-white ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                                : 'bg-white/10 hover:bg-white/20'
                        }`}
                    >
                        <Link href="/admin/settings" aria-label="Open settings">
                            <Settings2 className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>

            <div
                className="hidden h-16 shrink-0 items-center gap-x-4 px-6 text-white lg:flex"
                style={{ background: headerSurface }}
            >
                <div className="flex flex-1 items-center gap-4">
                    <span className="whitespace-nowrap text-sm font-semibold text-white/90">
                        Gym Management Admin Dashboard
                    </span>
                    <span className={isDark ? 'text-zinc-600' : 'text-white/35'}>.</span>

                    <div className="relative max-w-md flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/65" />
                        <input
                            type="text"
                            placeholder="Search members, payments, check-ins..."
                            className={`w-full rounded-xl py-2 pl-9 pr-4 text-sm text-white outline-none transition-all ${
                                isDark
                                    ? 'border border-[#2a2a2a] bg-[#1c1c1c] placeholder:text-zinc-500 focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]'
                                    : 'border border-white/15 bg-white/10 placeholder:text-white/65 focus:border-white/20 focus:bg-white/12 focus:ring-1 focus:ring-white/20'
                            }`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-x-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className={`h-9 w-9 rounded-full text-white hover:text-white ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                                : 'bg-white/10 hover:bg-white/20'
                        }`}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={`relative h-9 w-9 rounded-full text-white hover:text-white ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                                : 'bg-white/10 hover:bg-white/20'
                        }`}
                    >
                        <Bell className="h-4 w-4" />
                        <span className={`absolute right-2 top-2 h-2 w-2 rounded-full bg-[#10b981] ring-1 ${isDark ? 'ring-[#171717]' : 'ring-[#1266ea]'}`} />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className={`flex h-auto items-center gap-2 rounded-xl px-2 py-1 text-white hover:text-white ${
                                    isDark
                                        ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                                        : 'bg-white/10 hover:bg-white/20'
                                }`}
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.photo_url || undefined} alt={user.full_name} />
                                    <AvatarFallback className={`${isDark ? 'bg-slate-900/45' : 'bg-slate-900/25'} text-xs font-semibold text-white`}>
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-semibold leading-tight text-white">
                                        {user.full_name || 'Admin'}
                                    </span>
                                    <span className="text-[10px] capitalize leading-tight text-white/75">
                                        {formatRoleLabel(user.role || 'admin')}
                                    </span>
                                </div>
                                <ChevronDown className="h-3 w-3 text-white/75" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.full_name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/admin/settings" className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}

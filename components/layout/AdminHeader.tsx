'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
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
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Settings, Sun, User } from 'lucide-react'
import { useSidebar } from '@/components/layout/SidebarContext'

interface AdminHeaderProps {
    user: {
        email?: string
        full_name?: string
        photo_url?: string | null
        role?: string
    }
    desktopSidebarOpen?: boolean
}

export default function AdminHeader({ user, desktopSidebarOpen = false }: AdminHeaderProps) {
    void user
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

    return (
        <header className={`sticky top-0 z-40 ${isDark ? 'border-b border-[#2a2a2a]' : 'border-b border-blue-500/30'}`}>
            <div
                className="relative flex h-16 items-center justify-between px-4 text-white lg:hidden"
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

                <Link
                    href="/admin/dashboard"
                    className="absolute left-1/2 max-w-[calc(100%-7rem)] -translate-x-1/2 px-3 text-center"
                    aria-label="Go to dashboard"
                >
                    <p className="truncate text-lg font-semibold tracking-tight">FitGymSoftware</p>
                </Link>

                <div className="flex items-center gap-2">
                    <AnimatedThemeToggler
                        type="button"
                        isDark={isDark}
                        onClick={toggleTheme}
                        className={`h-10 w-10 rounded-full text-white hover:text-white ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                                : 'bg-white/10 hover:bg-white/20'
                        } [&_svg]:h-5 [&_svg]:w-5`}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    />

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
                            <Settings className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>

            <div
                className="hidden h-20 shrink-0 items-center gap-x-4 px-6 text-white lg:flex"
                style={{ background: headerSurface }}
            >
                <div className="flex flex-1 items-center gap-4">
                    <span
                        className={`whitespace-nowrap text-xl font-semibold text-white/90 transition-opacity duration-200 ${
                            desktopSidebarOpen ? 'opacity-0' : 'opacity-100'
                        }`}
                    >
                        FitGym Software
                    </span>
                </div>

                <div className="flex items-center gap-x-3">
                    <AnimatedThemeToggler
                        type="button"
                        isDark={isDark}
                        onClick={toggleTheme}
                        className={`h-9 w-9 rounded-full text-white hover:text-white ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                                : 'bg-white/10 hover:bg-white/20'
                        } [&_svg]:h-4 [&_svg]:w-4`}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    />

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

                    <Button
                        type="button"
                        onClick={() => void handleLogout()}
                        className={`h-9 rounded-xl px-4 text-sm font-medium text-white hover:text-white ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                                : 'bg-white/10 hover:bg-white/20'
                        }`}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </Button>
                </div>
            </div>
        </header>
    )
}

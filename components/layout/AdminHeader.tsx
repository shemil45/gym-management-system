'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { Bell, LogOut, Menu } from 'lucide-react'
import { useSidebar } from '@/components/layout/SidebarContext'

interface AdminHeaderProps {
    user: {
        email?: string
        full_name?: string
        photo_url?: string | null
        role?: string
        gym_name?: string
    }
    desktopSidebarOpen?: boolean
}

export default function AdminHeader({ user, desktopSidebarOpen = false }: AdminHeaderProps) {
    void user
    const router = useRouter()
    const { toggle } = useSidebar()
    const { isDark, toggleTheme } = useAdminTheme()
    const headerSurface = isDark ? '#171717' : '#f7f9fb'

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <header className={`fixed inset-x-0 top-0 z-40 lg:sticky lg:inset-x-auto ${isDark ? 'border-b border-[#2a2a2a]' : 'border-b border-[#c6c6cd]'}`}>
            <div
                className={`relative flex h-16 items-center justify-between px-4 lg:hidden ${isDark ? 'text-white' : 'text-[#191c1e]'}`}
                style={{ background: headerSurface }}
            >
                <button
                    onClick={toggle}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                        isDark
                            ? 'border border-[#2a2a2a] bg-[#1c1c1c]'
                            : 'border border-[#e7e9ee] bg-white text-[#45464d]'
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
                    <p
                        className={`truncate text-lg font-bold tracking-tight ${
                            isDark ? 'text-white' : 'text-[#191c1e]'
                        }`}
                    >
                        {user.gym_name || 'Gym Dashboard'}
                    </p>
                </Link>

                <div className="flex items-center gap-2">
                    <AnimatedThemeToggler
                        type="button"
                        isDark={isDark}
                        onClick={toggleTheme}
                        className={`h-10 w-10 rounded-full ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] text-white'
                                : 'border border-[#e7e9ee] bg-white text-[#45464d]'
                        } [&_svg]:h-5 [&_svg]:w-5`}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    />

                    <Button
                        type="button"
                        onClick={() => void handleLogout()}
                        className={`h-10 w-10 rounded-full p-0 ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] text-white'
                                : 'border border-[#e7e9ee] bg-white text-[#45464d]'
                        }`}
                        aria-label="Log out"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div
                className={`hidden h-20 shrink-0 items-center gap-x-4 px-6 lg:flex ${isDark ? 'text-white' : 'text-[#191c1e]'}`}
                style={{ background: headerSurface }}
            >
                <div className="flex flex-1 items-center gap-4">
                    <div
                        className={`transition-opacity duration-200 ${
                            desktopSidebarOpen ? 'opacity-0' : 'opacity-100'
                        }`}
                    >
                        <div className="flex items-center">
                            <span
                                className={`block truncate text-2xl font-bold tracking-tight ${
                                    isDark ? 'text-white' : 'text-[#191c1e]'
                                }`}
                            >
                                {user.gym_name || 'Gym Dashboard'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-x-3">
                    <AnimatedThemeToggler
                        type="button"
                        isDark={isDark}
                        onClick={toggleTheme}
                        className={`h-9 w-9 rounded-full ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] text-white hover:bg-[#222222] hover:text-white'
                                : 'text-[#45464d] hover:bg-[#eef0f2] hover:text-[#191c1e]'
                        } [&_svg]:h-4 [&_svg]:w-4`}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    />

                    <Button
                        variant="ghost"
                        size="icon"
                        className={`relative h-9 w-9 rounded-full ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] text-white hover:bg-[#222222] hover:text-white'
                                : 'text-[#45464d] hover:bg-[#eef0f2] hover:text-[#191c1e]'
                        }`}
                    >
                        <Bell className="h-4 w-4" />
                        <span className={`absolute right-2 top-2 h-2 w-2 rounded-full bg-[#10b981] ring-1 ${isDark ? 'ring-[#171717]' : 'ring-[#f7f9fb]'}`} />
                    </Button>

                    <Button
                        type="button"
                        onClick={() => void handleLogout()}
                        className={`h-9 rounded-lg px-4 text-sm font-bold ${
                            isDark
                                ? 'border border-[#2a2a2a] bg-[#1c1c1c] text-white hover:bg-[#222222] hover:text-white'
                                : 'bg-black text-white hover:bg-black/90'
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

'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Bell, Search, ChevronDown, Menu } from 'lucide-react'
import { useSidebar } from '@/components/layout/SidebarContext'

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
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
            {/* Hamburger – mobile only */}
            <button
                onClick={toggle}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors lg:hidden"
                aria-label="Open navigation"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Title + Search */}
            <div className="flex flex-1 items-center gap-4">
                {/* Page Title (hidden on desktop as it's in main content) */}
                <span className="hidden sm:block text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Gym Management Admin Dashboard
                </span>
                <span className="hidden sm:block text-gray-300">·</span>

                {/* Search bar - centered */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search members, payments, check-ins..."
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all"
                    />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-x-3">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full text-gray-500 hover:text-gray-700">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
                </Button>

                {/* Profile dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 h-auto px-2 py-1 rounded-lg hover:bg-gray-100"
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photo_url || undefined} alt={user.full_name} />
                                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden sm:flex flex-col items-start">
                                <span className="text-xs font-semibold text-gray-800 leading-tight">
                                    {user.full_name || 'Admin'}
                                </span>
                                <span className="text-[10px] text-gray-400 leading-tight capitalize">
                                    {user.role || 'admin'}
                                </span>
                            </div>
                            <ChevronDown className="hidden sm:block h-3 w-3 text-gray-400" />
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
                            <a href="/admin/settings" className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile Settings</span>
                            </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}

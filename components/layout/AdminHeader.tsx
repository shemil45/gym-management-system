'use client'

import Link from 'next/link'
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
import { Bell, ChevronDown, LogOut, Menu, Search, Settings2, User } from 'lucide-react'
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
        <header className="sticky top-0 z-40">
            <div className="flex h-16 items-center justify-between border-b border-blue-500/20 bg-[#0f5be1] px-4 text-white shadow-lg shadow-blue-900/10 lg:hidden">
                <button
                    onClick={toggle}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                    aria-label="Open navigation"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0 px-3 text-center">
                    <p className="truncate text-lg font-semibold tracking-tight">FitGymSoftware</p>
                </div>

                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                    <Link href="/admin/settings" aria-label="Open settings">
                        <Settings2 className="h-5 w-5" />
                    </Link>
                </Button>
            </div>

            <div className="hidden h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-6 shadow-sm lg:flex">
                <div className="flex flex-1 items-center gap-4">
                    <span className="whitespace-nowrap text-sm font-semibold text-gray-700">
                        Gym Management Admin Dashboard
                    </span>
                    <span className="text-gray-300">.</span>

                    <div className="relative max-w-md flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search members, payments, check-ins..."
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-x-3">
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-gray-500 hover:text-gray-700">
                        <Bell className="h-4 w-4" />
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex h-auto items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.photo_url || undefined} alt={user.full_name} />
                                    <AvatarFallback className="bg-blue-600 text-xs font-semibold text-white">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-semibold leading-tight text-gray-800">
                                        {user.full_name || 'Admin'}
                                    </span>
                                    <span className="text-[10px] capitalize leading-tight text-gray-400">
                                        {formatRoleLabel(user.role || 'admin')}
                                    </span>
                                </div>
                                <ChevronDown className="h-3 w-3 text-gray-400" />
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

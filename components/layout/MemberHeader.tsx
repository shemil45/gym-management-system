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
import { LogOut, User, Bell, ChevronDown, Menu, Dumbbell } from 'lucide-react'
import { useSidebar } from '@/components/layout/SidebarContext'

interface MemberHeaderProps {
    user: {
        email?: string
        full_name?: string
        photo_url?: string | null
        member_id?: string | null
    }
}

export default function MemberHeader({ user }: MemberHeaderProps) {
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
        .toUpperCase() || 'M'

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

            {/* Title */}
            <div className="flex flex-1 items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500">
                        <Dumbbell className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        GymFit Member Portal
                    </span>
                </div>

                {user.member_id && (
                    <>
                        <span className="hidden sm:block text-gray-300">·</span>
                        <span className="hidden sm:block text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {user.member_id}
                        </span>
                    </>
                )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-x-3">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full text-gray-500 hover:text-gray-700">
                    <Bell className="h-4 w-4" />
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
                                <AvatarFallback className="bg-emerald-500 text-white text-xs font-semibold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden sm:flex flex-col items-start">
                                <span className="text-xs font-semibold text-gray-800 leading-tight">
                                    {user.full_name || 'Member'}
                                </span>
                                <span className="text-[10px] text-gray-400 leading-tight">Member</span>
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
                            <a href="/member/profile" className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                <span>My Profile</span>
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

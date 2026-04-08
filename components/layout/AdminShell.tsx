'use client'

import { useState } from 'react'
import { Toaster } from 'sonner'

import AdminHeader from '@/components/layout/AdminHeader'
import AdminSidebar from '@/components/layout/AdminSidebar'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'

interface AdminShellProps {
  children: React.ReactNode
  user: {
    email?: string
    full_name?: string
    photo_url?: string | null
    role?: string
  }
}

export default function AdminShell({ children, user }: AdminShellProps) {
  const { isDark } = useAdminTheme()
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false)

  return (
    <div className={`admin-theme-${isDark ? 'dark' : 'light'} flex h-screen w-full overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-[#1a1f2e]'}`}>
      <Toaster richColors position="top-right" />
      <AdminSidebar desktopOpen={desktopSidebarOpen} setDesktopOpen={setDesktopSidebarOpen} />

      <div
        className={`flex min-w-0 flex-1 flex-col overflow-hidden lg:rounded-tl-[32px] lg:rounded-bl-none lg:border-l ${
          isDark
            ? 'bg-[#171717] lg:border-[#121212]'
            : 'bg-[#eef3fb] lg:border-[#1a1f2e]'
        }`}
      >
        <AdminHeader user={user} desktopSidebarOpen={desktopSidebarOpen} />
        <main
          className="flex-1 overflow-y-auto px-4 pb-24 pt-4 [&::-webkit-scrollbar]:hidden sm:px-6 sm:pb-8 sm:pt-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

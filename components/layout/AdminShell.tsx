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
    gym_name?: string
  }
}

export default function AdminShell({ children, user }: AdminShellProps) {
  const { isDark } = useAdminTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={`admin-theme-${isDark ? 'dark' : 'light'} flex h-[100dvh] min-h-[100svh] w-full flex-col overflow-hidden md:flex-row lg:h-screen ${isDark ? 'bg-[#222222]' : 'bg-gray-100'}`}>
      <Toaster richColors position="top-right" />
      <AdminSidebar user={user} open={sidebarOpen} setOpen={setSidebarOpen} />

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:rounded-tl-2xl md:border ${
          isDark
            ? 'border-neutral-700 bg-neutral-900'
            : 'border-neutral-200 bg-white'
        }`}
      >
        <AdminHeader user={user} onMenuClick={() => setSidebarOpen((current) => !current)} />
        <main
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-24 pt-6 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pb-8 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

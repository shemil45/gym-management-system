'use client'

import React, { type Dispatch, type SetStateAction } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import {
  IconArrowLeft,
  IconBarbell,
  IconCash,
  IconChartBar,
  IconChecklist,
  IconCreditCard,
  IconLayoutDashboard,
  IconReportAnalytics,
  IconSettings,
  IconUserBolt,
  IconUserCheck,
  IconUsers,
} from '@tabler/icons-react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar'

type AdminSidebarProps = {
  user?: {
    email?: string
    full_name?: string
    photo_url?: string | null
  }
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const iconClassName = 'h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200'

const links = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: <IconLayoutDashboard className={iconClassName} />,
  },
  {
    label: 'Members',
    href: '/admin/members',
    icon: <IconUsers className={iconClassName} />,
  },
  {
    label: 'Staff',
    href: '/admin/staff',
    icon: <IconUserBolt className={iconClassName} />,
  },
  {
    label: 'Check-ins',
    href: '/admin/check-ins',
    icon: <IconUserCheck className={iconClassName} />,
  },
  {
    label: 'Payments',
    href: '/admin/finances/payments',
    icon: <IconCreditCard className={iconClassName} />,
  },
  {
    label: 'Expenses',
    href: '/admin/finances/expenses',
    icon: <IconCash className={iconClassName} />,
  },
  {
    label: 'Plans',
    href: '/admin/plans',
    icon: <IconChecklist className={iconClassName} />,
  },
  {
    label: 'Reports',
    href: '/admin/reports',
    icon: <IconReportAnalytics className={iconClassName} />,
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: <IconSettings className={iconClassName} />,
  },
]

export default function AdminSidebar({ user, open, setOpen }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()

    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/login')
    router.refresh()
  }

  const profileLabel = user?.full_name || user?.email || 'Admin'

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody
        showMobileTrigger={false}
        className="justify-between gap-10 border-r border-neutral-200 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800"
      >
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {open ? <Logo /> : <LogoIcon />}

          <div className="mt-8 flex flex-col gap-2">
            {links.map((link) => {
              const isActive =
                pathname === link.href || pathname?.startsWith(`${link.href}/`)

              return (
                <SidebarLink
                  key={link.href}
                  link={link}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'rounded-md px-2 transition-colors',
                    isActive
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                      : 'hover:bg-white/70 dark:hover:bg-neutral-700/70'
                  )}
                />
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SidebarLink
            link={{
              label: profileLabel,
              href: '/admin/settings',
              icon: user?.photo_url ? (
                <Image
                  src={user.photo_url}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                  width={50}
                  height={50}
                  alt=""
                  unoptimized
                />
              ) : (
                <IconChartBar className="h-7 w-7 shrink-0 rounded-full bg-neutral-200 p-1.5 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200" />
              ),
            }}
            onClick={() => setOpen(false)}
            className="rounded-md px-2 hover:bg-white/70 dark:hover:bg-neutral-700/70"
          />

          <SidebarLink
            link={{
              label: 'Logout',
              href: '/login',
              icon: <IconArrowLeft className={iconClassName} />,
            }}
            onClick={(event) => void handleLogout(event)}
            className="rounded-md px-2 hover:bg-white/70 dark:hover:bg-neutral-700/70"
          />
        </div>
      </SidebarBody>
    </Sidebar>
  )
}

function Logo() {
  return (
    <a
      href="/admin/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white">
        <IconBarbell className="h-4 w-4 text-white dark:text-black" />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white"
      >
        GMS Cloud
      </motion.span>
    </a>
  )
}

function LogoIcon() {
  return (
    <a
      href="/admin/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
      aria-label="Go to dashboard"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white">
        <IconBarbell className="h-4 w-4 text-white dark:text-black" />
      </div>
    </a>
  )
}

'use client'

import React, { type Dispatch, type SetStateAction } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import {
  LayoutDashboard,
  Users,
  User,
  UserCheck,
  CreditCard,
  DollarSign,
  ClipboardList,
  BarChart2,
  Settings,
  ArrowLeft,
  Dumbbell,
} from 'lucide-react'

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
    icon: <LayoutDashboard className={iconClassName} />,
  },
  {
    label: 'Members',
    href: '/admin/members',
    icon: <Users className={iconClassName} />,
  },
  {
    label: 'Staff',
    href: '/admin/staff',
    icon: <User className={iconClassName} />,
  },
  {
    label: 'Check-ins',
    href: '/admin/check-ins',
    icon: <UserCheck className={iconClassName} />,
  },
  {
    label: 'Payments',
    href: '/admin/finances/payments',
    icon: <CreditCard className={iconClassName} />,
  },
  {
    label: 'Expenses',
    href: '/admin/finances/expenses',
    icon: <DollarSign className={iconClassName} />,
  },
  {
    label: 'Plans',
    href: '/admin/plans',
    icon: <ClipboardList className={iconClassName} />,
  },
  {
    label: 'Reports',
    href: '/admin/reports',
    icon: <BarChart2 className={iconClassName} />,
  },
  // {
  //   label: 'Settings',
  //   href: '/admin/settings',
  //   icon: <Settings className={iconClassName} />,
  // },
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
        className="justify-between gap-10 bg-gray-100 dark:bg-neutral-800"
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
                      ? 'bg-white text-neutral-900 dark:bg-neutral-700 dark:text-white'
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
                <Settings className={iconClassName} />              ),
            }}
            onClick={() => setOpen(false)}
            className="rounded-md px-2 hover:bg-white/70 dark:hover:bg-neutral-700/70"
          />

          <SidebarLink
            link={{
              label: 'Logout',
              href: '/login',
              icon: <ArrowLeft className={iconClassName} />,
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
    <div
      className="relative z-20 flex items-center space-x-2 py-1 text-black"
    >
      <a href="/admin/dashboard"
      className='flex gap-2 items-center'>
        <div className="md:mt-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white">
          <Dumbbell className="h-4 w-4 text-white dark:text-black" />
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:mt-2.5 font-['Hanken_Grotesk',sans-serif] text-2xl leading-[1.1] tracking-[-0.02em] font-bold text-black dark:text-white sm:text-3xl whitespace-pre"
        >
          GMS Cloud
        </motion.span>
      </a>
    </div>
  )
}

function LogoIcon() {
  return (
    <a
      href="/admin/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
      aria-label="Go to dashboard"
    >
      <div className="mt-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white">
        <Dumbbell className="h-4 w-4 text-white dark:text-black" />
      </div>
    </a>
  )
}

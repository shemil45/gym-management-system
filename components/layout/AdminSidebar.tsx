'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { useSidebar } from '@/components/layout/SidebarContext'
import {
  DesktopSidebar,
  Sidebar,
  SidebarBody,
  SidebarLink,
} from '@/components/sidebar'
import {
  ChevronDown,
  Dumbbell,
  FileBarChart,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Settings,
  TrendingUp,
  UserCheck,
  UserRoundCog,
  Users,
  X,
} from 'lucide-react'

type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  children?: { name: string; href: string }[]
}

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Members', href: '/admin/members', icon: Users },
  { name: 'Staff', href: '/admin/staff', icon: UserRoundCog },
  { name: 'Check-ins', href: '/admin/check-ins', icon: UserCheck },
  {
    name: 'Finances',
    href: '/admin/finances',
    icon: TrendingUp,
    children: [
      { name: 'Payments', href: '/admin/finances/payments' },
      { name: 'Expenses', href: '/admin/finances/expenses' },
    ],
  },
  { name: 'Plans', href: '/admin/plans', icon: LayoutList },
  { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
] satisfies NavigationItem[]

function BrandBlock({ desktopOpen }: { desktopOpen?: boolean }) {
  const { isDark } = useAdminTheme()
  const expanded = Boolean(desktopOpen)

  return (
    <div className={cn('flex items-start', expanded ? 'justify-start' : 'justify-center')}>
      <div className={cn('flex items-center', expanded ? 'gap-3' : 'flex-col gap-1')}>
        <div
          className={cn(
            'flex items-center justify-center shadow-lg',
            expanded
              ? isDark
                ? 'h-11 w-11 rounded-2xl bg-[#10b981] shadow-[#10b981]/20'
                : 'h-11 w-11 rounded-2xl bg-blue-600 shadow-blue-600/30'
              : isDark
                ? 'h-9 w-9 rounded-lg bg-[#10b981] shadow-[#10b981]/20'
                : 'h-9 w-9 rounded-lg bg-blue-600 shadow-blue-600/30'
          )}
        >
          <Dumbbell className="h-5 w-5 text-white" />
        </div>
        <div className={cn('min-w-0', expanded ? '' : 'text-center')}>
          <span
            className={cn(
              'block font-bold tracking-wide text-white',
              expanded ? 'text-sm' : 'text-[11px]'
            )}
          >
            FitGym
          </span>
        </div>
      </div>
    </div>
  )
}

function DesktopNav({
  open,
  onLogout,
}: {
  open: boolean
  onLogout: () => Promise<void>
}) {
  const { isDark } = useAdminTheme()
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (name: string) => {
    setExpandedSections((current) => ({
      ...current,
      [name]: !current[name],
    }))
  }

  return (
    <SidebarBody
      className={cn(
        'overflow-hidden rounded-r-none px-3 py-4',
        isDark
          ? 'bg-[#121212] shadow-[0_24px_48px_rgba(0,0,0,0.28)]'
          : 'bg-[linear-gradient(180deg,#1a1f2e_0%,#141824_100%)] shadow-[0_24px_48px_rgba(15,23,42,0.22)]'
      )}
    >
        <BrandBlock desktopOpen={open} />

        <div className={cn('mx-1 mb-4 mt-4 h-px', isDark ? 'bg-[#2a2a2a]' : 'bg-white/10')} />

        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navigation.map((item) => {
              const hasActiveChild =
                item.children?.some(
                  (child) => pathname === child.href || pathname?.startsWith(child.href + '/')
                ) ?? false
              const isExpanded = item.children ? expandedSections[item.name] ?? hasActiveChild : false
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + '/') || hasActiveChild

              if (item.children) {
                return (
                  <li key={item.name}>
                    <div className={cn('rounded-2xl', isActive && 'bg-white/5')}>
                      <button
                        type="button"
                        onClick={() => toggleSection(item.name)}
                        className={cn(
                          'flex w-full items-center rounded-2xl transition-all duration-200',
                          open ? 'justify-between gap-3 px-4 py-3 text-sm' : 'justify-center px-2 py-3',
                          isActive
                            ? isDark
                              ? 'bg-[#1f1f1f] text-white shadow-lg shadow-black/20'
                              : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                            : isDark
                              ? 'text-zinc-400 hover:bg-[#1d1d1d] hover:text-white'
                              : 'text-slate-400 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <div className={cn('flex items-center', open ? 'gap-3' : 'flex-col gap-1')}>
                          <item.icon
                            className={cn(
                              'h-5 w-5 shrink-0',
                              isActive
                                ? isDark
                                  ? 'text-[#10b981]'
                                  : 'text-white'
                                : isDark
                                  ? 'text-zinc-400 group-hover:text-white'
                                  : 'text-slate-400 group-hover:text-white'
                            )}
                            aria-hidden="true"
                          />
                          {open ? <span className="truncate text-left font-medium">{item.name}</span> : null}
                        </div>
                        {open ? (
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 shrink-0 transition-transform',
                              isExpanded ? 'rotate-180' : ''
                            )}
                          />
                        ) : null}
                      </button>

                      {open && isExpanded ? (
                        <div className="px-2 pb-2 pt-1">
                          <ul className="space-y-1">
                            {item.children.map((child) => {
                              const isChildActive =
                                pathname === child.href || pathname?.startsWith(child.href + '/')

                              return (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    className={cn(
                                      'block rounded-xl px-3 py-2 text-sm transition-colors',
                                      isChildActive
                                        ? isDark
                                          ? 'bg-[#1f1f1f] font-semibold text-[#10b981]'
                                          : 'bg-blue-600/20 font-semibold text-white'
                                        : isDark
                                          ? 'text-zinc-400 hover:bg-[#1d1d1d] hover:text-white'
                                          : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                    )}
                                  >
                                    {child.name}
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              }

              return (
                <li key={item.name}>
                  <SidebarLink
                    link={{
                      label: item.name,
                      href: item.href,
                      icon: (
                        <item.icon
                          className={cn(
                            'h-5 w-5 shrink-0',
                            isActive
                              ? isDark
                                ? 'text-[#10b981]'
                                : 'text-white'
                              : isDark
                                ? 'text-zinc-400 group-hover:text-white'
                                : 'text-slate-400 group-hover:text-white'
                          )}
                          aria-hidden="true"
                        />
                      ),
                    }}
                    className={cn(
                      'group rounded-2xl transition-all duration-200',
                      open
                        ? 'px-4 py-3 text-sm font-medium'
                        : 'flex-col justify-center px-2 py-3 text-xs font-medium',
                      isActive
                        ? isDark
                          ? 'bg-[#1f1f1f] text-white shadow-lg shadow-black/20'
                          : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : isDark
                          ? 'text-zinc-400 hover:bg-[#1d1d1d] hover:text-white'
                          : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    )}
                  />
                </li>
              )
            })}
          </ul>
        </nav>

        <div className={cn('mx-1 mt-4 border-t pt-4', isDark ? 'border-[#2a2a2a]' : 'border-white/10')}>
          {open ? (
            <button
              type="button"
              onClick={() => void onLogout()}
              className={cn(
                'mb-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white transition-colors',
                isDark
                  ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]'
                  : 'bg-white/10 hover:bg-white/15'
              )}
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          ) : null}
          <p className={cn('text-center', open ? 'text-[11px]' : 'text-[9px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>&copy; 2026 GymFit</p>
          <p className={cn('text-center', open ? 'text-[11px]' : 'text-[9px]', isDark ? 'text-zinc-600' : 'text-slate-600')}>Version 1.0.0</p>
        </div>
      </SidebarBody>
  )
}

function MobileSidebarContent({ onClose }: { onClose?: () => void }) {
  const { isDark } = useAdminTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    onClose?.()
    router.push('/login')
    router.refresh()
  }

  const toggleSection = (name: string) => {
    setExpandedSections((current) => ({
      ...current,
      [name]: !current[name],
    }))
  }

  return (
    <div
      className="flex h-full grow flex-col overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden"
      style={{
        scrollbarWidth: 'none',
        background: isDark
          ? 'linear-gradient(180deg, #121212 0%, #171717 100%)'
          : 'linear-gradient(180deg, #0f5be1 0%, #0c4ec6 100%)',
      }}
    >
      <div className="relative mt-4 flex shrink-0 flex-col px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg', isDark ? 'bg-[#10b981]/15 shadow-[#10b981]/10' : 'bg-white/15 shadow-blue-900/20')}>
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block text-base font-bold tracking-wide text-white">GymFit</span>
              <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-blue-100/80')}>Management</span>
            </div>
          </div>

          {onClose ? (
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={cn('mx-4 mb-4 mt-4 h-px', isDark ? 'bg-[#2a2a2a]' : 'bg-white/15')} />

      <nav className="flex flex-1 flex-col px-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          {navigation.map((item) => {
            const hasActiveChild =
              item.children?.some(
                (child) => pathname === child.href || pathname?.startsWith(child.href + '/')
              ) ?? false
            const isExpanded = item.children ? expandedSections[item.name] ?? hasActiveChild : false
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + '/') || hasActiveChild

            return (
              <li key={item.name}>
                <div className={cn('rounded-2xl', item.children && isActive && (isDark ? 'bg-white/5' : 'bg-white/10'))}>
                  {item.children ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(item.name)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? isDark
                            ? 'bg-[#1f1f1f] text-white shadow-xl shadow-black/20'
                            : 'bg-white text-blue-700 shadow-xl shadow-blue-900/20'
                          : isDark
                            ? 'text-zinc-300 hover:bg-[#1d1d1d] hover:text-white'
                            : 'text-white/85 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-colors',
                          isActive
                            ? isDark
                              ? 'text-[#10b981]'
                              : 'text-blue-700'
                            : isDark
                              ? 'text-zinc-400 group-hover:text-white'
                              : 'text-white/75 group-hover:text-white'
                        )}
                        aria-hidden="true"
                      />
                      <div className="flex flex-1 items-center justify-between gap-1.5">
                        <span className="leading-tight text-left">{item.name}</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform',
                            isExpanded ? 'rotate-180' : ''
                          )}
                        />
                      </div>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? isDark
                            ? 'bg-[#1f1f1f] text-white shadow-xl shadow-black/20'
                            : 'bg-white text-blue-700 shadow-xl shadow-blue-900/20'
                          : isDark
                            ? 'text-zinc-300 hover:bg-[#1d1d1d] hover:text-white'
                            : 'text-white/85 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-colors',
                          isActive
                            ? isDark
                              ? 'text-[#10b981]'
                              : 'text-blue-700'
                            : isDark
                              ? 'text-zinc-400 group-hover:text-white'
                              : 'text-white/75 group-hover:text-white'
                        )}
                        aria-hidden="true"
                      />
                      <div className="flex flex-1 items-center justify-between gap-1.5">
                        <span className="leading-tight text-left">{item.name}</span>
                      </div>
                    </Link>
                  )}

                  {item.children && isExpanded ? (
                    <div className="px-3 pb-2 pt-1">
                      <ul className="space-y-1">
                        {item.children.map((child) => {
                          const isChildActive =
                            pathname === child.href || pathname?.startsWith(child.href + '/')

                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onClose}
                                className={cn(
                                  'block rounded-xl px-4 py-2.5 text-sm transition-colors',
                                  isChildActive
                                    ? isDark
                                      ? 'bg-[#1f1f1f] font-semibold text-[#10b981]'
                                      : 'bg-white font-semibold text-blue-700'
                                    : isDark
                                      ? 'text-zinc-400 hover:bg-[#1d1d1d] hover:text-white'
                                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                                )}
                              >
                                {child.name}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={cn('mx-4 border-t px-2 pt-4', isDark ? 'border-[#2a2a2a]' : 'border-white/15')}>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className={cn(
            'mb-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white transition-colors',
            isDark ? 'border border-[#2a2a2a] bg-[#1c1c1c] hover:bg-[#222222]' : 'bg-white/10 hover:bg-white/15'
          )}
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
        <p className={cn('text-center text-[10px]', isDark ? 'text-zinc-400' : 'text-blue-100/80')}>&copy; 2026 GymFit</p>
        <p className={cn('text-center text-[10px]', isDark ? 'text-zinc-500' : 'text-blue-100/60')}>Version 1.0.0</p>
      </div>
    </div>
  )
}

interface AdminSidebarProps {
  desktopOpen?: boolean
  setDesktopOpen?: Dispatch<SetStateAction<boolean>>
}

export default function AdminSidebar({
  desktopOpen: controlledDesktopOpen,
  setDesktopOpen: controlledSetDesktopOpen,
}: AdminSidebarProps) {
  const { isOpen, close } = useSidebar()
  const router = useRouter()
  const [internalDesktopOpen, setInternalDesktopOpen] = useState(false)
  const desktopOpen = controlledDesktopOpen ?? internalDesktopOpen
  const setDesktopOpen = controlledSetDesktopOpen ?? setInternalDesktopOpen

  const handleDesktopLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <div className="hidden h-full lg:block">
        <Sidebar open={desktopOpen} setOpen={setDesktopOpen}>
          <DesktopSidebar>
            <DesktopNav open={desktopOpen} onLogout={handleDesktopLogout} />
          </DesktopSidebar>
        </Sidebar>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={close}
        aria-hidden="true"
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[18rem] max-w-[86vw] flex-col transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <MobileSidebarContent onClose={close} />
      </div>
    </>
  )
}

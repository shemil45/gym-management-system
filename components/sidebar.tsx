'use client'

import Link, { type LinkProps } from 'next/link'
import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils/cn'

export interface Links {
  label: string
  href: string
  icon: React.JSX.Element | React.ReactNode
}

interface SidebarContextProps {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export function SidebarProvider({
  children,
  open = false,
  setOpen,
  animate = true,
}: {
  children: ReactNode
  open?: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  animate?: boolean
}) {
  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

function useSidebarContext() {
  const context = useContext(SidebarContext)

  if (!context) {
    throw new Error('Sidebar components must be used within SidebarProvider')
  }

  return context
}

export function Sidebar({
  children,
  open = false,
  setOpen,
  animate = true,
}: {
  children: ReactNode
  open?: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  animate?: boolean
}) {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

export function SidebarBody({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div className={cn('flex h-full w-full flex-col', className)} {...props}>
      {children}
    </motion.div>
  )
}

export function DesktopSidebar({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  const { open, setOpen, animate } = useSidebarContext()

  return (
    <motion.div
      className={cn(
        'hidden h-full shrink-0 overflow-hidden lg:flex',
        animate && 'transition-[width] duration-300 ease-in-out',
        open ? 'w-[280px]' : 'w-[104px]',
        className
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function MobileSidebar({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex h-full flex-col lg:hidden', className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarLink({
  link,
  className,
  ...props
}: {
  link: Links
  className?: string
} & Omit<LinkProps, 'href'>) {
  const { open } = useSidebarContext()

  return (
    <Link className={cn('flex items-center gap-3', className)} href={link.href} {...props}>
      <span className="shrink-0">{link.icon}</span>
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          display: open ? 'inline-block' : 'none',
        }}
        className="truncate whitespace-pre text-sm"
      >
        {link.label}
      </motion.span>
    </Link>
  )
}

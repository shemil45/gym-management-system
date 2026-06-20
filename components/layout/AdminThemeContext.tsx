'use client'

import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react'
import { applyTheme, getPreferredTheme, persistTheme, type AppTheme } from '@/lib/theme'

export type AdminTheme = AppTheme

interface AdminThemeContextType {
  theme: AdminTheme
  isDark: boolean
  setTheme: (theme: AdminTheme) => void
  toggleTheme: () => void
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined)

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() => {
    return getPreferredTheme('light')
  })

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme: (nextTheme: AdminTheme) => {
        setThemeState(nextTheme)
        persistTheme(nextTheme)
      },
      toggleTheme: () => {
        setThemeState((current) => {
          const nextTheme = current === 'dark' ? 'light' : 'dark'
          persistTheme(nextTheme)
          return nextTheme
        })
      },
    }),
    [theme]
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext)

  if (!context) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider')
  }

  return context
}

'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type AdminTheme = 'light' | 'dark'

interface AdminThemeContextType {
  theme: AdminTheme
  isDark: boolean
  setTheme: (theme: AdminTheme) => void
  toggleTheme: () => void
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'gym-admin-theme'

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }

    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'dark'
  })

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme: (nextTheme: AdminTheme) => {
        setThemeState(nextTheme)
        window.localStorage.setItem(STORAGE_KEY, nextTheme)
      },
      toggleTheme: () => {
        setThemeState((current) => {
          const nextTheme = current === 'dark' ? 'light' : 'dark'
          window.localStorage.setItem(STORAGE_KEY, nextTheme)
          return nextTheme
        })
      },
    }),
    [theme]
  )

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext)

  if (!context) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider')
  }

  return context
}

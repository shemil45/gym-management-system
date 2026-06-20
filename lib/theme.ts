export type AppTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'gms-theme'

export function getStoredTheme(defaultTheme: AppTheme = 'light'): AppTheme {
  if (typeof window === 'undefined') {
    return defaultTheme
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return defaultTheme
}

export function getPreferredTheme(defaultTheme: AppTheme = 'light'): AppTheme {
  if (typeof window === 'undefined') {
    return defaultTheme
  }

  const storedTheme = getStoredTheme(defaultTheme)
  if (storedTheme !== defaultTheme || window.localStorage.getItem(THEME_STORAGE_KEY)) {
    return storedTheme
  }

  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches

  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function persistTheme(theme: AppTheme) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

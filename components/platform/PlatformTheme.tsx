'use client'

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from 'react'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

/*
  Self-contained theme control for the platform portal.

  Mirrors the member portal's provider deliberately: the portal paints from
  tokens on `.platform-portal`, so dark mode is a class on that element only
  and <html> is never touched, which keeps the three portals from fighting
  over a single global class.

  Both the stored preference and the OS preference are external stores, so
  they are read with useSyncExternalStore rather than mirrored into state in
  an effect. That keeps the server snapshot stable and avoids a render pass
  that would flash the wrong theme.
*/

type Mode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'platform-portal-theme'
/** Fired on the same tab, since `storage` only reaches other tabs. */
const CHANGE_EVENT = 'platform-portal-theme-change'

interface ThemeValue {
    mode: Mode
    resolved: 'light' | 'dark'
    setMode: (mode: Mode) => void
}

const ThemeContext = createContext<ThemeValue>({
    mode: 'system',
    resolved: 'light',
    setMode: () => {},
})

export function usePlatformTheme() {
    return useContext(ThemeContext)
}

/** Used when storage is blocked, so the toggle still works for the session. */
let inMemoryMode: Mode = 'system'

function readStoredMode(): Mode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {
        /* private mode or blocked storage: fall back to the in-memory value */
    }
    return inMemoryMode
}

function subscribeToStoredMode(onChange: () => void) {
    window.addEventListener('storage', onChange)
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => {
        window.removeEventListener('storage', onChange)
        window.removeEventListener(CHANGE_EVENT, onChange)
    }
}

function subscribeToSystem(onChange: () => void) {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
}

function readSystem(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function PlatformThemeProvider({ children }: { children: ReactNode }) {
    const mode = useSyncExternalStore(subscribeToStoredMode, readStoredMode, () => 'system' as Mode)
    const system = useSyncExternalStore(subscribeToSystem, readSystem, () => 'light' as const)

    const setMode = useCallback((next: Mode) => {
        inMemoryMode = next
        try {
            localStorage.setItem(STORAGE_KEY, next)
        } catch {
            /* storage blocked: the in-memory value still drives this session */
        }
        window.dispatchEvent(new Event(CHANGE_EVENT))
    }, [])

    const resolved = mode === 'system' ? system : mode

    const value = useMemo<ThemeValue>(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])

    return (
        <ThemeContext.Provider value={value}>
            <div className={cn('platform-portal min-h-[100dvh]', resolved === 'dark' && 'dark')}>
                {children}
            </div>
        </ThemeContext.Provider>
    )
}

const OPTIONS: { mode: Mode; label: string; Icon: typeof IconSun }[] = [
    { mode: 'light', label: 'Light', Icon: IconSun },
    { mode: 'system', label: 'System', Icon: IconDeviceDesktop },
    { mode: 'dark', label: 'Dark', Icon: IconMoon },
]

/** Three-state segmented control. System is a real, selectable state. */
export function ThemeToggle() {
    const { mode, setMode } = usePlatformTheme()

    return (
        <div
            role="radiogroup"
            aria-label="Colour theme"
            className="inline-flex items-center gap-0.5 rounded-[var(--p-r-control)] border border-[var(--p-line)] bg-[var(--p-surface-2)] p-0.5"
        >
            {OPTIONS.map(({ mode: option, label, Icon }) => (
                <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={mode === option}
                    aria-label={label}
                    title={label}
                    onClick={() => setMode(option)}
                    className={cn(
                        'flex h-6 w-7 items-center justify-center rounded-[6px] transition-colors',
                        mode === option
                            ? 'bg-[var(--p-surface)] text-[var(--p-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                            : 'text-[var(--p-ink-3)] hover:text-[var(--p-ink-2)]',
                    )}
                >
                    <Icon size={13} stroke={1.8} />
                </button>
            ))}
        </div>
    )
}

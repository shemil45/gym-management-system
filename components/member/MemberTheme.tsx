'use client'

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from 'react'

/*
  Self-contained theme control for the member portal.

  The portal paints from tokens on `.member-portal`, so dark mode is a class on
  that element only. It deliberately does not touch <html>, which the admin and
  platform portals own.

  Both the stored preference and the OS preference are external stores, so they
  are read with useSyncExternalStore rather than mirrored into state inside an
  effect. That keeps the server snapshot ('system' / light) stable and avoids a
  render pass that would flash the wrong theme.
*/

type Mode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'member-portal-theme'
/** Fired on the same tab, since `storage` only reaches other tabs. */
const CHANGE_EVENT = 'member-portal-theme-change'

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

export function useMemberTheme() {
    return useContext(ThemeContext)
}

function subscribeToStoredMode(onChange: () => void) {
    window.addEventListener('storage', onChange)
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => {
        window.removeEventListener('storage', onChange)
        window.removeEventListener(CHANGE_EVENT, onChange)
    }
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

function subscribeToSystem(onChange: () => void) {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
}

function readSystemDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function MemberThemeProvider({ children }: { children: ReactNode }) {
    const mode = useSyncExternalStore<Mode>(
        subscribeToStoredMode,
        readStoredMode,
        () => 'system',
    )
    const systemDark = useSyncExternalStore(subscribeToSystem, readSystemDark, () => false)

    const setMode = useCallback((next: Mode) => {
        inMemoryMode = next
        try {
            localStorage.setItem(STORAGE_KEY, next)
        } catch {
            /* nothing to persist to; the in-memory value carries the session */
        }
        window.dispatchEvent(new Event(CHANGE_EVENT))
    }, [])

    const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

    const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])

    return (
        <ThemeContext.Provider value={value}>
            <div className={resolved === 'dark' ? 'member-portal dark' : 'member-portal'}>
                {children}
            </div>
        </ThemeContext.Provider>
    )
}

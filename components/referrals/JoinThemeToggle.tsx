'use client'

import { useEffect, useState } from 'react'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { applyTheme, getPreferredTheme, persistTheme, type AppTheme } from '@/lib/theme'

/** Same light/dark switch the auth pages use, for the public join pages. */
export default function JoinThemeToggle() {
    const [theme, setTheme] = useState<AppTheme>(() => getPreferredTheme('light'))
    const isDark = theme === 'dark'

    useEffect(() => {
        applyTheme(theme)
        persistTheme(theme)
    }, [theme])

    return (
        <AnimatedThemeToggler
            isDark={isDark}
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            type="button"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 text-[#45464d] transition-colors hover:text-[#191c1e] dark:text-[#cfc4c5] dark:hover:text-white [&_svg]:h-4 [&_svg]:w-4"
        />
    )
}

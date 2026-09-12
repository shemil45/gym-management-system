'use client'

import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { useMemberTheme } from '@/components/member/MemberTheme'

/**
 * Header theme switch.
 *
 * Two states only: it flips to the opposite of whatever is currently showing.
 * The three-way control including Auto stays in Account, where a settings list
 * is the right place to explain the difference.
 *
 * Shares the admin portal's circular view-transition reveal; the member
 * theme is driven through the controlled `isDark` + `onClick` pair, so the
 * toggler never touches the document-level `dark` class the admin uses.
 */
export function ThemeToggleButton() {
    const { resolved, setMode } = useMemberTheme()
    const isDark = resolved === 'dark'
    const next = isDark ? 'light' : 'dark'

    return (
        <AnimatedThemeToggler
            isDark={isDark}
            onClick={() => setMode(next)}
            aria-label={`Switch to ${next} theme`}
            className="m-tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-ink)] [&_svg]:h-[19px] [&_svg]:w-[19px] [&_svg]:[stroke-width:1.6]"
        />
    )
}

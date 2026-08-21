'use client'

import { IconMoon, IconSun } from '@tabler/icons-react'
import { useMemberTheme } from '@/components/member/MemberTheme'

/**
 * Header theme switch.
 *
 * Two states only: it flips to the opposite of whatever is currently showing.
 * The three-way control including Auto stays in Account, where a settings list
 * is the right place to explain the difference.
 */
export function ThemeToggleButton() {
    const { resolved, setMode } = useMemberTheme()
    const next = resolved === 'dark' ? 'light' : 'dark'

    return (
        <button
            type="button"
            onClick={() => setMode(next)}
            aria-label={`Switch to ${next} theme`}
            className="m-tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-ink)]"
        >
            {resolved === 'dark' ? (
                <IconSun size={19} stroke={1.7} />
            ) : (
                <IconMoon size={19} stroke={1.7} />
            )}
        </button>
    )
}

"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { applyTheme, getPreferredTheme, persistTheme, type AppTheme } from '@/lib/theme'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/login'
    const ctaHref = isLoginPage ? '/admin/register' : '/login'
    const ctaLabel = isLoginPage ? 'Sign Up' : 'Sign In'

    return (
        <div className="flex min-h-screen flex-col bg-[#f7f9fb] dark:bg-black">
            <header className="sticky top-0 z-50 w-full border-b border-[#c6c6cd] bg-[#f7f9fb] dark:border-[#27272a] dark:bg-black">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
                    <Link href="/">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
                                <Dumbbell className="h-4 w-4 text-white dark:text-black" />
                            </div>
                            <span className="text-base font-bold tracking-tight text-[#191c1e] dark:text-white">
                                GMS Cloud
                            </span>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-8 md:flex">
                        {['Features', 'Pricing', 'Security', 'Support'].map((item) => (
                            <Link
                                key={item}
                                href="#"
                                className="text-sm font-medium text-[#45464d] transition-colors hover:text-[#191c1e] dark:text-[#cfc4c5] dark:hover:text-white"
                            >
                                {item}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link
                            href={ctaHref}
                            className="rounded-lg bg-black px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
                        >
                            {ctaLabel}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
                {children}
            </main>

            {/* <footer className="w-full border-t border-[#c6c6cd] py-5 dark:border-[#27272a]">
                <p className="text-center text-xs font-medium uppercase tracking-widest text-[#76777d] opacity-60 dark:text-[#988e90]">
                    Trusted by 5,000+ facilities
                </p>
            </footer> */}
        </div>
    )
}

function ThemeToggle() {
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

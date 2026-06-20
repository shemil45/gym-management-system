"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dumbbell, Moon, Sun } from 'lucide-react'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col bg-[#f7f9fb] dark:bg-black">
            <header className="sticky top-0 z-50 w-full border-b border-[#c6c6cd] bg-[#f7f9fb] dark:border-[#27272a] dark:bg-black">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#131b2e] dark:bg-white">
                            <Dumbbell className="h-5 w-5 text-white dark:text-black" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#191c1e] dark:text-white">
                            GMS Cloud
                        </span>
                    </div>

                    <nav className="hidden items-center gap-10 md:flex">
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

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            type="button"
                            className="rounded-lg bg-[#131b2e] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
                {children}
            </main>

            <footer className="w-full border-t border-[#c6c6cd] py-6 dark:border-[#27272a]">
                <p className="text-center text-xs font-medium uppercase tracking-widest text-[#76777d] opacity-60 dark:text-[#988e90]">
                    Trusted by 5,000+ facilities
                </p>
            </footer>
        </div>
    )
}

function ThemeToggle() {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const stored = window.localStorage.getItem('gms-theme')
        if (stored === 'dark' || stored === 'light') {
            const dark = stored === 'dark'
            setIsDark(dark)
            if (dark) document.documentElement.classList.add('dark')
            else document.documentElement.classList.remove('dark')
            return
        }

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(prefersDark)
        if (prefersDark) document.documentElement.classList.add('dark')
    }, [])

    const toggle = () => {
        const next = !isDark
        setIsDark(next)
        if (next) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
        window.localStorage.setItem('gms-theme', next ? 'dark' : 'light')
    }

    return (
        <button
            onClick={toggle}
            type="button"
            aria-label="Toggle theme"
            className="p-2 text-[#45464d] transition-colors hover:text-[#191c1e] dark:text-[#cfc4c5] dark:hover:text-white"
        >
            {isDark ? <IconSun /> : <IconMoon />}
        </button>
    )
}

function IconSun() {
    return <Sun className="h-5 w-5" />
}

function IconMoon() {
    return <Moon className="h-5 w-5" />
}
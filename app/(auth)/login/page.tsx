'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'

type Role = 'owner' | 'team'

function GoogleIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    )
}

export default function LoginPage() {
    const router = useRouter()
    const [role, setRole] = useState<Role>('owner')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Login succeeded but no user session was returned.')

            startTransition(() => {
                router.replace('/redirect')
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to login. Please check your credentials.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative w-full max-w-[480px] dark:max-w-md">
            {/* Ambient glow — dark theme only, scoped to the card now instead of the viewport */}
            <div className="pointer-events-none absolute -top-16 -left-16 hidden h-72 w-72 rounded-full bg-white/5 blur-[100px] dark:block" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 hidden h-72 w-72 rounded-full bg-white/5 blur-[100px] dark:block" />

            <div className="relative z-10">
                {/* Role Toggle */}
                <div
                    className="mx-auto mb-8 flex w-fit rounded-xl bg-[#f2f4f6] p-1.5 sm:mb-10
                    dark:rounded-xl dark:border dark:border-[#27272a] dark:bg-[#1b1b1e] dark:p-1"
                >
                    <button
                        type="button"
                        onClick={() => setRole('owner')}
                        className={`rounded-lg px-6 py-2.5 text-sm font-bold tracking-[0.01em] transition-all ${
                            role === 'owner'
                                ? 'bg-white text-[#191c1e] shadow-sm dark:bg-white dark:text-black'
                                : 'text-[#45464d] hover:bg-[#e6e8ea] dark:text-[#cfc4c5] dark:hover:text-[#c6c6c6] dark:hover:bg-transparent'
                        }`}
                    >
                        Owner Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('team')}
                        className={`rounded-lg px-6 py-2.5 text-sm font-bold tracking-[0.01em] transition-all ${
                            role === 'team'
                                ? 'bg-white text-[#191c1e] shadow-sm dark:bg-white dark:text-black'
                                : 'text-[#45464d] hover:bg-[#e6e8ea] dark:text-[#cfc4c5] dark:hover:text-[#c6c6c6] dark:hover:bg-transparent'
                        }`}
                    >
                        Team Login
                    </button>
                </div>

                {/* Login Card */}
                <div
                    className="rounded-xl border border-[#c6c6cd] bg-white p-6 shadow-[0px_4px_6px_rgba(15,23,42,0.05)] sm:p-10
                    dark:rounded-2xl dark:border-[#27272a] dark:bg-[#0e0e11] dark:shadow-none"
                >
                    <div className="mb-8 text-center sm:mb-10">
                        <h1 className="font-['Hanken_Grotesk',_sans-serif] text-[32px] leading-[1.1] tracking-[-0.02em] font-bold text-[#191c1e] sm:text-[40px] dark:text-white dark:text-[32px] dark:leading-[40px] dark:tracking-[-0.01em] dark:font-semibold">
                            Welcome back
                        </h1>
                        <p className="mt-2 text-[18px] font-medium text-[#45464d] dark:mt-2 dark:text-[12px] dark:font-medium dark:uppercase dark:tracking-[0.2em] dark:text-[#cfc4c5]/70">
                            Admin Login Portal
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    {/* Google SSO */}
                    <button
                        type="button"
                        className="group mb-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[#c6c6cd] py-3 transition-colors hover:bg-[#f7f9fb]
                        dark:mb-8 dark:border-[#4c4546] dark:bg-transparent dark:hover:bg-[#1f1f22]"
                    >
                        <GoogleIcon />
                        <span className="text-sm font-semibold text-[#191c1e] dark:text-[#e4e1e6]">
                            Continue with Google
                        </span>
                    </button>

                    {/* Separator */}
                    <div className="relative mb-6 flex items-center dark:mb-8">
                        <div className="flex-grow border-t border-[#c6c6cd] dark:border-[#4c4546]" />
                        <span className="mx-4 flex-shrink-0 text-xs font-medium tracking-widest text-[#76777d] uppercase dark:text-[#988e90]">
                            or continue with email
                        </span>
                        <div className="flex-grow border-t border-[#c6c6cd] dark:border-[#4c4546]" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="block text-sm font-semibold tracking-[0.01em] text-[#191c1e] dark:text-[#e4e1e6]"
                            >
                                Email or Mobile Number
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                className="w-full rounded-lg border border-[#c6c6cd] bg-white px-4 py-3 text-base text-[#191c1e] outline-none transition-shadow placeholder:text-[#76777d] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                                dark:border-[#4c4546] dark:bg-[#1b1b1e] dark:text-[#e4e1e6] dark:placeholder:text-[#cfc4c5]/40 dark:focus:border-white dark:focus:ring-1 dark:focus:ring-white/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-semibold tracking-[0.01em] text-[#191c1e] dark:text-[#e4e1e6]"
                                >
                                    Password
                                </label>
                                <Link
                                    href="/reset-password"
                                    className="text-xs font-medium text-[#9d4300] hover:underline dark:text-[#cfc4c5] dark:hover:text-white"
                                >
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative flex items-center">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="w-full rounded-lg border border-[#c6c6cd] bg-white px-4 py-3 pr-12 text-base text-[#191c1e] outline-none transition-shadow placeholder:text-[#76777d] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                                    dark:border-[#4c4546] dark:bg-[#1b1b1e] dark:text-[#e4e1e6] dark:focus:border-white dark:focus:ring-1 dark:focus:ring-white/10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-4 text-[#c6c6cd] transition-colors hover:text-[#45464d] dark:text-[#cfc4c5] dark:hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#131b2e] py-3.5 text-sm font-bold text-white transition-all
                            hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60
                            dark:bg-white dark:text-black dark:hover:bg-[#e4e4e7] dark:hover:-translate-y-px"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="hidden h-4 w-4 dark:inline-block" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-base text-[#45464d] dark:text-sm dark:text-[#cfc4c5]">
                            Don&apos;t have an account?{' '}
                            <Link
                                href="/admin/register"
                                className="font-bold text-[#9d4300] hover:underline dark:text-[#e4e1e6] dark:hover:text-white"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Supplementary helper copy — kept from prior implementation, styled to match card */}
                <div className="mt-6 space-y-2 text-center">
                    <p className="text-xs text-[#76777d] dark:text-[#988e90]">
                        New member accounts are created by gym admins. Use your email as the username and your
                        assigned password to sign in.
                    </p>
                </div>
            </div>
        </div>
    )
}
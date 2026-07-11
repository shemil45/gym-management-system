'use client'

import { startTransition, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { registerGymOwner } from '@/app/(auth)/admin/register/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const inputClass =
    "w-full rounded-sm border border-[#c6c6cd] bg-white px-3.5 py-2.5 text-sm text-[#191c1e] outline-none transition-shadow placeholder:text-[#76777d] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-[#4c4546] dark:bg-[#1b1b1e] dark:text-[#e4e1e6] dark:placeholder:text-[#cfc4c5]/40 dark:focus:border-white dark:focus:ring-1 dark:focus:ring-white/10"

const labelClass =
    "block text-xs font-semibold tracking-[0.01em] text-[#191c1e] dark:text-[#e4e1e6]"

export default function RegisterGymOwnerForm() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [gymName, setGymName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const registerResult = await registerGymOwner({
                name,
                email,
                password,
                gym_name: gymName,
            })

            if (registerResult.error) {
                setError(registerResult.error)
                return
            }

            const supabase = createClient()
            const signInResult = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInResult.error || !signInResult.data.user) {
                setError(signInResult.error?.message ?? 'Account created, but automatic sign-in failed. Please sign in manually.')
                return
            }

            startTransition(() => {
                router.replace('/redirect')
            })
        } catch (submitError) {
            const message = submitError instanceof Error
                ? submitError.message
                : 'Failed to create your gym workspace.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative w-full max-w-100 text-sm">
            <div className="pointer-events-none absolute -top-12 -left-12 hidden h-60 w-60 rounded-full bg-white/5 blur-[80px] dark:block" />
            <div className="pointer-events-none absolute -bottom-12 -right-12 hidden h-60 w-60 rounded-full bg-white/5 blur-[80px] dark:block" />

            <div className="relative z-10">
                <div className="rounded-xl border border-[#c6c6cd] bg-white p-5 shadow-[0px_4px_6px_rgba(15,23,42,0.05)] sm:p-8 dark:border-[#27272a] dark:bg-[#0e0e11]">
                    <div className="mb-6 text-center sm:mb-8">
                        <h1 className="font-['Hanken_Grotesk',sans-serif] text-2xl leading-[1.1] tracking-[-0.02em] font-bold text-[#191c1e] sm:text-3xl dark:text-white">
                            Launch your gym <br/> workspace
                        </h1>
                        <p className="mt-2 text-sm font-medium text-[#45464d] dark:text-[#cfc4c5]/70">
                            Create your owner account.
                        </p>
                    </div>

                    {error ? (
                        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                            {error}
                        </div>
                    ) : null}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className={labelClass}>
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="John Doe"
                                    required
                                    disabled={loading}
                                    className={inputClass}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="gym_name" className={labelClass}>
                                    Gym Name
                                </Label>
                                <Input
                                    id="gym_name"
                                    value={gymName}
                                    onChange={(event) => setGymName(event.target.value)}
                                    placeholder="Iron Temple Elite"
                                    required
                                    disabled={loading}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email" className={labelClass}>
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="name@example.com"
                                required
                                disabled={loading}
                                className={inputClass}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password" className={labelClass}>
                                Password
                            </Label>
                            <div className="relative flex items-center">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="•••••••••••••"
                                    required
                                    minLength={8}
                                    disabled={loading}
                                    className={`${inputClass} pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((current) => !current)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 text-[#c6c6cd] transition-colors hover:text-[#45464d] dark:text-[#cfc4c5] dark:hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full overflow-hidden rounded-lg bg-[#9d4300] py-2.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white"
                        >
                            <span className="absolute inset-y-0 left-1/2 w-0 bg-[#823700] transition-all duration-400 ease-out group-hover:left-0 group-hover:w-full dark:bg-zinc-200" />

                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Gym'
                                )}
                            </span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-[#45464d] dark:text-[#cfc4c5]">
                            Already have an owner account?{' '}
                            <Link
                                href="/login"
                                className="font-bold text-[#9d4300] hover:underline dark:text-[#e4e1e6] dark:hover:text-white"
                            >
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex justify-center gap-3 text-center">
                    <Link
                        href="/terms"
                        className="text-xs text-[#76777d] dark:text-[#988e90]"
                    >
                        Terms
                    </Link>
                    <Link
                        href="/privacy"
                        className="text-xs text-[#76777d] dark:text-[#988e90]"
                    >
                        Privacy
                    </Link>
                    <Link
                        href="/security"
                        className="text-xs text-[#76777d] dark:text-[#988e90]"
                    >
                        Security
                    </Link>
                </div>
            </div>
        </div>
    )
}

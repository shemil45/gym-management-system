'use client'

import { startTransition, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { registerGymOwner } from '@/app/(auth)/admin/register/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const inputClass =
    "w-full rounded-none border border-[#c6c6cd] bg-white px-3.5 py-2.5 text-sm text-[#191c1e] placeholder:text-[#98939c] transition-colors focus:border-black focus:outline-none focus:ring-0 focus-visible:ring-0 dark:border-[#27272a] dark:bg-[#0e0e11] dark:text-[#e4e1e6] dark:placeholder:text-[#4c4546] dark:focus:border-white"

const labelClass =
    "text-xs font-medium tracking-[0.05em] text-[#191c1e] dark:text-[#e4e1e6]"

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
        <div className="relative w-full">
            {/* Decorative Right Image — desktop only, dark theme only. Positioned relative to this full-width wrapper. */}
            <div className="pointer-events-none absolute right-[-10%] top-1/2 hidden aspect-[4/5] w-2/5 -translate-y-1/2 rotate-[5deg] grayscale brightness-50 dark:opacity-20 dark:lg:block">
                <div className="h-full w-full overflow-hidden border border-[#27272a] bg-gradient-to-br from-[#27272a] to-[#18181b]">
                    <div
                        className="h-full w-full bg-cover bg-center"
                        style={{
                            backgroundImage:
                                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC6ZIfQX8UwV0pIl_y-UwIszOVAJvv0rwZHYlUQEZvW19BHgUFutYPJx1xfeEbUtxgAyANeVs3nLrubr30rs-SVtSrmIkTj5gyNgYGVh3b5mnocECM2wc1oZ9SBvXATuinn1_CnGOLtR-lCYDwSp3NJfykTGRfVN73dcihzuZIIHICZ5ma8PfIuo0HrA4w2KkWtZn9sqMtzKAIzl3QcWtR-xeiZHs2Q4qkMlFWygiItRv5twuiQdfXz-uHD99wPhStswPinahU7ArVU")',
                        }}
                    />
                </div>
            </div>

            <div className="relative z-10 mx-auto w-full max-w-md">
                {/* Header */}
                <div className="mb-6 text-center">
                    <div className="mb-3 text-3xl font-bold uppercase tracking-tight text-[#191c1e] dark:text-white md:text-4xl">
                        GMS Cloud
                    </div>
                    <h1 className="mx-auto mb-1.5 max-w-md text-2xl font-semibold bg-clip-text text-transparent bg-linear-to-r from-[#B65A00] to-[#301301] dark:text-white md:text-2xl">
                        Launch your gym workspace
                    </h1>
                    <p className="text-xs text-[#45464d] dark:text-[#cfc4c5]">
                        Create your owner account.
                    </p>
                </div>

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error ? (
                        <Alert className="rounded-none border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Full Name */}
                        <div className="space-y-1">
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

                        {/* Gym Name */}
                        <div className="space-y-1">
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

                    {/* Email */}
                    <div className="space-y-1">
                        <Label htmlFor="email" className={labelClass}>
                            Email Address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="owner@gymcloud.com"
                            required
                            disabled={loading}
                            className={inputClass}
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                        <Label htmlFor="password" className={labelClass}>
                            Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={8}
                                disabled={loading}
                                className={`${inputClass} pr-10`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#76777d] transition-colors hover:text-black dark:text-[#988e90] dark:hover:text-white"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-6 pt-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full overflow-hidden rounded-none bg-[#9d4300] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-2xl transition-all duration-300 hover:bg-[#9d4300] active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white"
                        >
                            <span className="absolute inset-y-0 left-1/2 w-0 bg-[#823700] transition-all duration-400 ease-out group-hover:left-0 group-hover:w-full dark:bg-zinc-200" />

                            <span className="relative z-10 flex items-center justify-center">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Gym'
                                )}
                            </span>
                        </button>

                        {/* Footer links */}
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-full space-y-2 border-t border-[#c6c6cd] pt-2 text-center dark:border-[#27272a]">
                                <Link
                                    href="/login"
                                    className="text-xs tracking-[0.05em] text-[#45464d] transition-colors hover:text-black dark:text-[#cfc4c5] dark:hover:text-white"
                                >
                                    Already have an owner account?{' '}
                                    <span className="border-b border-black font-bold text-[#191c1e] dark:border-white dark:text-white">
                                        Sign In
                                    </span>
                                </Link>
                                <div className="mt-2 flex justify-center space-x-3 opacity-60">
                                    <Link
                                        href="/terms"
                                        className="text-[9px] uppercase tracking-wider text-[#45464d] transition-colors hover:text-black dark:text-[#988e90] dark:hover:text-white"
                                    >
                                        Terms
                                    </Link>
                                    <span className="text-[9px] text-[#98939c] dark:text-[#4c4546]">/</span>
                                    <Link
                                        href="/privacy"
                                        className="text-[9px] uppercase tracking-wider text-[#45464d] transition-colors hover:text-black dark:text-[#988e90] dark:hover:text-white"
                                    >
                                        Privacy
                                    </Link>
                                    <span className="text-[9px] text-[#98939c] dark:text-[#4c4546]">/</span>
                                    <Link
                                        href="/security"
                                        className="text-[9px] uppercase tracking-wider text-[#45464d] transition-colors hover:text-black dark:text-[#988e90] dark:hover:text-white"
                                    >
                                        Security
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

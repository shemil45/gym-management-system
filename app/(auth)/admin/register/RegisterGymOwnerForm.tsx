'use client'

import { startTransition, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Dumbbell, Eye, EyeOff, Loader2 } from 'lucide-react'
import { registerGymOwner } from '@/app/(auth)/admin/register/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

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
        <div className="space-y-8">
            <div className="space-y-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-blue-400/20 bg-blue-500/12 shadow-[0_14px_44px_rgba(37,99,235,0.3)]">
                    <Dumbbell className="h-8 w-8 text-blue-400" />
                </div>
                <p className="text-sm uppercase tracking-[0.28em] text-white/30">Owner Onboarding</p>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-[2.8rem]">
                    Launch your gym workspace
                </h1>
                <p className="text-base text-white/55">
                    Create your owner account, your first gym tenant, and jump straight into the admin dashboard.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                    {error ? (
                        <Alert className="border-red-500/20 bg-red-500/8 text-red-200">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="space-y-2.5">
                        <Label htmlFor="name" className="text-sm font-medium text-white">
                            Your name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Alex Johnson"
                            required
                            disabled={loading}
                            className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label htmlFor="gym_name" className="text-sm font-medium text-white">
                            Gym name
                        </Label>
                        <Input
                            id="gym_name"
                            value={gymName}
                            onChange={(event) => setGymName(event.target.value)}
                            placeholder="Iron Forge Fitness"
                            required
                            disabled={loading}
                            className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label htmlFor="email" className="text-sm font-medium text-white">
                            Email address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="owner@gym.com"
                            required
                            disabled={loading}
                            className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label htmlFor="password" className="text-sm font-medium text-white">
                            Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Create a strong password"
                                required
                                minLength={8}
                                disabled={loading}
                                className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 pr-12 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/75"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-14 w-full rounded-2xl bg-[#2f6cf6] text-base font-semibold text-white shadow-[0_14px_38px_rgba(47,108,246,0.32)] transition hover:bg-[#2563eb]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating workspace...
                            </>
                        ) : (
                            <>
                                Create gym
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>

                    <p className="text-center text-sm text-white/50">
                        Already have an owner account?{' '}
                        <Link href="/login" className="text-[#7aa2ff] transition-colors hover:text-white">
                            Sign in
                        </Link>
                    </p>
                </div>
            </form>
        </div>
    )
}

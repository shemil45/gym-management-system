'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
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
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to login. Please check your credentials.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center">
                <p className="text-sm uppercase tracking-[0.28em] text-white/30">Welcome Back</p>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-[2.8rem]">
                    Sign in
                </h1>
                <p className="text-base text-white/55">
                    Use the credentials provided by your gym admin to continue.
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-5">
                    {error && (
                        <Alert className="border-red-500/20 bg-red-500/8 text-red-200">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2.5">
                        <Label htmlFor="email" className="text-sm font-medium text-white">
                            Email address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="hello@app.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-sm font-medium text-white">
                                Password
                            </Label>
                            <Link
                                href="/reset-password"
                                className="text-sm text-[#7aa2ff] transition-colors hover:text-white"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 pr-12 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
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
                        className="h-14 w-full rounded-2xl bg-[#2f6cf6] text-base font-semibold text-white shadow-[0_14px_38px_rgba(47,108,246,0.32)] transition hover:bg-[#2563eb]"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Logging in...
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>

                    <p className="text-center text-sm text-white/50">
                        New member accounts are created by gym admins. Use your email as the username and your assigned password to sign in.
                    </p>
                    <p className="text-center text-sm text-white/50">
                        Opening a new gym?{' '}
                        <Link href="/admin/register" className="text-[#7aa2ff] transition-colors hover:text-white">
                            Create an owner account
                        </Link>
                    </p>
                </div>
            </form>
        </div>
    )
}

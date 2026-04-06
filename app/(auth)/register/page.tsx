'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { InsertTables } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccessMsg(null)

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match")
            setLoading(false)
            return
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        if (!/^[6-9]\d{9}$/.test(formData.phone)) {
            setError('Invalid phone number (must be 10 digits)')
            setLoading(false)
            return
        }

        try {
            const supabase = createClient()

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            })

            if (authError) throw authError

            if (!authData.user) {
                throw new Error('Failed to create user')
            }

            const profilePayload: InsertTables<'profiles'> = {
                id: authData.user.id,
                role: 'member',
                full_name: formData.fullName,
                phone: formData.phone,
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .insert(profilePayload as never)

            if (profileError) throw profileError

            if (authData.session) {
                router.push('/complete-profile')
                router.refresh()
            } else {
                setSuccessMsg('Registration successful! Please check your email to verify your account.')
                setFormData({
                    fullName: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: '',
                })
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to register. Please try again.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center">
                <p className="text-sm uppercase tracking-[0.28em] text-white/30">Create Account</p>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-[2.8rem]">
                    Sign up
                </h1>
                <p className="text-base text-white/55">
                    Create your member account to get started.
                </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-5">
                    {error && (
                        <Alert className="border-red-500/20 bg-red-500/8 text-red-200">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {successMsg && (
                        <Alert className="border-emerald-500/20 bg-emerald-500/8 text-emerald-200">
                            <AlertDescription>{successMsg}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2.5">
                        <Label htmlFor="fullName" className="text-sm font-medium text-white">
                            Full name
                        </Label>
                        <Input
                            id="fullName"
                            name="fullName"
                            type="text"
                            placeholder="John Doe"
                            value={formData.fullName}
                            onChange={handleChange}
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
                            name="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label htmlFor="phone" className="text-sm font-medium text-white">
                            Phone number
                        </Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="9876543210"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label htmlFor="password" className="text-sm font-medium text-white">
                            Password
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-white">
                            Confirm password
                        </Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            className="h-14 rounded-2xl border-white/8 bg-[#262626] px-4 text-base text-white placeholder:text-white/35 focus:border-[#2f6cf6] focus:ring-[#2f6cf6]"
                        />
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
                                Creating account...
                            </>
                        ) : (
                            <>
                                Create account
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>

                    <p className="text-center text-sm text-white/50">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold text-white transition-colors hover:text-[#7aa2ff]">
                            Sign in
                        </Link>
                    </p>
                </div>
            </form>
        </div>
    )
}

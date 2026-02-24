'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

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

        // Validation
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

            // Sign up user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            })

            if (authError) throw authError

            if (!authData.user) {
                throw new Error('Failed to create user')
            }

            // Create profile (member role by default)
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    role: 'member',
                    full_name: formData.fullName,
                    phone: formData.phone,
                })

            if (profileError) throw profileError

            // Redirect to member dashboard
            router.push('/member/dashboard')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Failed to register. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                <CardDescription>
                    Register as a new member
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            name="fullName"
                            type="text"
                            placeholder="John Doe"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="9876543210"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            'Register'
                        )}
                    </Button>

                    <p className="text-sm text-center text-gray-600">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-600 hover:underline font-medium">
                            Login
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    )
}

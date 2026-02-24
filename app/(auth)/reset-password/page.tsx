'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const supabase = createClient()

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            })

            if (error) throw error

            setSuccess(true)
            setEmail('')
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                <CardDescription>
                    Enter your email address and we'll send you a reset link
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleResetPassword}>
                <CardContent className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="border-green-200 bg-green-50 text-green-800">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription>
                                Password reset email sent! Check your inbox.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                                Sending...
                            </>
                        ) : (
                            'Send Reset Link'
                        )}
                    </Button>

                    <p className="text-sm text-center text-gray-600">
                        Remember your password?{' '}
                        <Link href="/login" className="text-blue-600 hover:underline font-medium">
                            Back to Login
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    )
}

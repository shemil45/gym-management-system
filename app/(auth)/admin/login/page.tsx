import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata = {
    title: 'Admin login',
}

export default function AdminLoginPage() {
    return (
        <LoginForm
            portal="admin"
            portalLabel="Admin Login Portal"
            signUp={{
                prompt: "Don't have an account?",
                href: '/admin/register',
                label: 'Sign up',
            }}
            helperText={
                <>
                    Gym owners and staff sign in here. Members should use the{' '}
                    <Link href="/member/login" className="font-semibold hover:underline">
                        member login
                    </Link>
                    .
                </>
            }
        />
    )
}

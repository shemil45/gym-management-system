import LoginForm from '@/components/auth/LoginForm'

export const metadata = {
    title: 'Member login',
}

export default function MemberLoginPage() {
    return (
        <LoginForm
            portal="member"
            portalLabel="Member Login Portal"
            helperText="New member accounts are created by gym admins. Use your email as the username and your assigned password to sign in."
        />
    )
}

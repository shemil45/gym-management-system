import { redirect } from 'next/navigation'

/** Convenience alias: /register is where people guess signup lives. */
export default function RegisterPage() {
    redirect('/admin/register')
}

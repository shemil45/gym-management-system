import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

/**
 * Public shell for the referral landing page: the same header the auth
 * pages use, minus the sign-in call to action (the visitor is not a user).
 */
export default function JoinLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-[#f7f9fb] dark:bg-black">
            <header className="w-full border-b border-[#c6c6cd] bg-[#f7f9fb] dark:border-[#27272a] dark:bg-black">
                <div className="mx-auto flex h-16 max-w-7xl items-center px-6 sm:px-8">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
                            <Dumbbell className="h-4 w-4 text-white dark:text-black" />
                        </span>
                        <span className="text-base font-bold tracking-tight text-[#191c1e] dark:text-white">GMS Cloud</span>
                    </Link>
                </div>
            </header>
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">{children}</main>
        </div>
    )
}

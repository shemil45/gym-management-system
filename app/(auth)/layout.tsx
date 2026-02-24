import { Dumbbell } from 'lucide-react'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex-col justify-between">
                <div className="flex items-center gap-3 text-white">
                    <Dumbbell className="h-8 w-8" />
                    <span className="text-2xl font-bold">Gym Management</span>
                </div>

                <div className="text-white">
                    <h1 className="text-4xl font-bold mb-4">
                        Manage Your Gym with Ease
                    </h1>
                    <p className="text-lg text-blue-100">
                        Complete solution for membership management, check-ins, payments, and analytics.
                    </p>
                </div>

                <div className="text-blue-100 text-sm">
                    © 2026 Gym Management System. All rights reserved.
                </div>
            </div>

            {/* Right side - Auth forms */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    )
}

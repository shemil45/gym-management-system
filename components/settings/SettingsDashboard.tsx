'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { User, Lock, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateProfile, updatePassword } from '@/app/admin/settings/actions'

interface Profile {
    id: string
    full_name: string
    phone: string | null
    photo_url: string | null
    role: string
}

interface SettingsDashboardProps {
    profile: Profile
    email: string
}

export default function SettingsDashboard({ profile, email }: SettingsDashboardProps) {
    const router = useRouter()
    const [profilePending, startProfileTransition] = useTransition()
    const [passwordPending, startPasswordTransition] = useTransition()

    const [fullName, setFullName] = useState(profile.full_name)
    const [phone, setPhone] = useState(profile.phone ?? '')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const fd = new FormData()
        fd.append('full_name', fullName)
        fd.append('phone', phone)
        startProfileTransition(async () => {
            const result = await updateProfile(fd)
            if (result.error) toast.error(result.error)
            else { toast.success('Profile updated'); router.refresh() }
        })
    }

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const fd = new FormData()
        fd.append('password', password)
        fd.append('confirm_password', confirmPassword)
        startPasswordTransition(async () => {
            const result = await updatePassword(fd)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Password changed')
                setPassword('')
                setConfirmPassword('')
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage your admin profile and password</p>
            </div>

            <div className="max-w-lg space-y-5">
                {/* Profile info */}
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                            <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Personal Info</h2>
                            <p className="text-xs text-gray-400">Update your display name and phone</p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        {/* Email — read only */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">
                                Email <span className="text-gray-400 font-normal">(cannot change)</span>
                            </Label>
                            <Input
                                value={email}
                                disabled
                                className="h-10 border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">
                                Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">Phone</Label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Phone number"
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>

                        {/* Role badge */}
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            <p className="text-xs text-emerald-700 font-medium capitalize">
                                Role: {profile.role}
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={profilePending}
                            className="h-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                        >
                            {profilePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Profile
                        </Button>
                    </form>
                </div>

                {/* Change password */}
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                            <Lock className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Change Password</h2>
                            <p className="text-xs text-gray-400">Minimum 6 characters</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">New Password</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">Confirm Password</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={passwordPending}
                            variant="outline"
                            className="h-10 w-full border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold"
                        >
                            {passwordPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, User, Lock, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/admin/settings/account/actions'
import { formatRoleLabel } from '@/lib/auth/roles'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import LoadingLinkButton from '@/components/ui/loading-link-button'

interface Profile {
    id: string
    full_name: string
    phone: string | null
    photo_url: string | null
    role: string
}

interface AccountSettingsProps {
    profile: Profile
    email: string
}

export default function AccountSettings({ profile, email }: AccountSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const [profilePending, startProfileTransition] = useTransition()
    const [passwordPending, startPasswordTransition] = useTransition()

    const [fullName, setFullName] = useState(profile.full_name)
    const [phone, setPhone] = useState(profile.phone ?? '')
    const [oldPassword, setOldPassword] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [oldPasswordTouched, setOldPasswordTouched] = useState(false)
    const [passwordTouched, setPasswordTouched] = useState(false)
    const [confirmTouched, setConfirmTouched] = useState(false)

    // Password strength: 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong
    const getStrength = (pw: string): number => {
        if (!pw) return 0
        let score = 0
        if (pw.length >= 6) score++
        if (pw.length >= 10) score++
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
        if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
        return score
    }
    const strength = getStrength(password)
    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
    const strengthColor = [
        '',
        'bg-red-500',
        'bg-amber-400',
        'bg-blue-500',
        'bg-emerald-500',
    ][strength]

    const oldPasswordError = oldPasswordTouched && oldPassword.length === 0
        ? 'Current password is required'
        : null
    const passwordError = passwordTouched && password.length > 0 && password.length < 6
        ? 'Minimum 6 characters required'
        : passwordTouched && password.length >= 6 && oldPassword.length > 0 && password === oldPassword
            ? 'New password must be different from your current password'
            : null
    const confirmError = confirmTouched && confirmPassword.length > 0 && confirmPassword !== password
        ? 'Passwords do not match'
        : null

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

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setOldPasswordTouched(true)
        setPasswordTouched(true)
        setConfirmTouched(true)

        if (!oldPassword) return
        if (!password || password.length < 6) return
        if (oldPassword === password) return
        if (password !== confirmPassword) return

        startPasswordTransition(async () => {
            const supabase = createClient()

            // Verify old password by re-authenticating
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password: oldPassword,
            })
            if (authError) {
                toast.error('Current password is incorrect')
                return
            }

            // Old password verified — update to new password
            const { error } = await supabase.auth.updateUser({ password })
            if (error) {
                toast.error(error.message)
            } else {
                toast.success('Password changed successfully')
                setOldPassword('')
                setPassword('')
                setConfirmPassword('')
                setOldPasswordTouched(false)
                setPasswordTouched(false)
                setConfirmTouched(false)
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <LoadingLinkButton
                    href="/admin/settings"
                    loadingText="Going back..."
                    variant="ghost"
                    className={`mb-3 flex h-9 items-center gap-1.5 rounded-xl px-2 ${
                        isDark ? 'text-zinc-300 hover:bg-[#242424] hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                </LoadingLinkButton>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>My Account</h1>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Manage your staff profile and password
                </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-2">
                {/* Profile info */}
                <div
                    className={`flex h-full flex-col rounded-xl p-6 ${
                        isDark
                            ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
                            : 'border border-gray-200 bg-white shadow-sm'
                    }`}
                >
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                                <User className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                            </div>
                            <div>
                                <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Personal Info</h2>
                            </div>
                        </div>

                        <div
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                                isDark ? 'border-[#10b981]/20 bg-[#10b981]/10' : 'border-emerald-100 bg-emerald-50'
                            }`}
                        >
                            <ShieldCheck className={`h-4 w-4 shrink-0 ${isDark ? 'text-[#10b981]' : 'text-emerald-600'}`} />
                            <p className={`text-xs font-medium ${isDark ? 'text-[#8df0c9]' : 'text-emerald-700'}`}>
                                {formatRoleLabel(profile.role)}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="flex flex-1 flex-col space-y-4">
                        {/* Email — read only */}
                        <div className="space-y-1.5">
                            <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                                Email <span className={isDark ? 'text-zinc-500 font-normal' : 'text-gray-400 font-normal'}>(cannot change)</span>
                            </Label>
                            <Input
                                value={email}
                                disabled
                                className={`h-10 text-sm cursor-not-allowed ${
                                    isDark ? 'border-[#2a2a2a] bg-[#161616] text-zinc-500' : 'border-gray-200 bg-gray-50 text-gray-500'
                                }`}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                                Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                className={`h-10 text-sm ${isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'}`}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Phone</Label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Phone number"
                                className={`h-10 text-sm ${isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'}`}
                            />
                        </div>

                        <div className="mt-auto pt-1">
                            <Button
                                type="submit"
                                disabled={profilePending}
                                className={`h-10 w-full font-semibold shadow-sm ${
                                    isDark ? 'bg-[#10b981] hover:bg-[#0ea271] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                {profilePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Profile
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Change password */}
                <div
                    className={`flex h-full flex-col rounded-xl p-6 ${
                        isDark
                            ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
                            : 'border border-gray-200 bg-white shadow-sm'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
                            <Lock className={`h-4 w-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        </div>
                        <div>
                            <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Change Password</h2>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Minimum 6 characters</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="flex flex-1 flex-col space-y-4">
                        {/* Current / old password */}
                        <div className="space-y-1.5">
                            <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Current Password</Label>
                            <Input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => { setOldPassword(e.target.value); setOldPasswordTouched(true) }}
                                placeholder="Enter your current password"
                                className={`h-10 text-sm ${
                                    oldPasswordError
                                        ? 'border-red-400 focus:ring-red-400'
                                        : isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'
                                }`}
                            />
                            {oldPasswordError && (
                                <p className="text-[11px] text-red-500 flex items-center gap-1">
                                    <span>⚠</span> {oldPasswordError}
                                </p>
                            )}
                        </div>

                        <div className={`h-px ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-100'}`} />

                        <div className="space-y-1.5">
                            <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>New Password</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true) }}
                                placeholder="••••••••"
                                className={`h-10 text-sm ${
                                    passwordError
                                        ? 'border-red-400 focus:ring-red-400'
                                        : isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'
                                }`}
                            />

                            {/* Strength bar — appears once user starts typing */}
                            {password.length > 0 && (
                                <div className="space-y-1 pt-0.5">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((seg) => (
                                            <div
                                                key={seg}
                                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                    strength >= seg ? strengthColor : isDark ? 'bg-[#2a2a2a]' : 'bg-gray-200'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-[11px] font-medium ${strength === 1 ? 'text-red-500' :
                                        strength === 2 ? 'text-amber-500' :
                                            strength === 3 ? 'text-blue-500' :
                                                'text-emerald-500'
                                        }`}>
                                        {strengthLabel}
                                        {strength === 1 && ' — try adding uppercase letters, numbers or symbols'}
                                        {strength === 2 && ' — add numbers & symbols to strengthen it'}
                                    </p>
                                </div>
                            )}

                            {/* Inline error */}
                            {passwordError && (
                                <p className="text-[11px] text-red-500 flex items-center gap-1">
                                    <span>⚠</span> {passwordError}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Confirm Password</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true) }}
                                placeholder="••••••••"
                                className={`h-10 text-sm ${
                                    confirmError
                                        ? 'border-red-400 focus:ring-red-400'
                                        : isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'
                                }`}
                            />
                            {confirmError && (
                                <p className="text-[11px] text-red-500 flex items-center gap-1">
                                    <span>⚠</span> {confirmError}
                                </p>
                            )}
                        </div>

                        <div className="mt-auto pt-1">
                            <Button
                                type="submit"
                                disabled={passwordPending}
                                variant="outline"
                                className={`h-10 w-full font-semibold ${
                                    isDark
                                        ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                        : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                }`}
                            >
                                {passwordPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

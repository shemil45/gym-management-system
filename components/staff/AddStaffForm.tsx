'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, ImageIcon, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { createStaff } from '@/app/admin/staff/actions'
import { STAFF_ROLES, formatRoleLabel, type StaffRole } from '@/lib/auth/roles'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, UPLOAD_FAILURE_MESSAGE } from '@/lib/constants/uploads'
import { Button } from '@/components/ui/button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

export default function AddStaffForm() {
    const router = useRouter()
    const { isDark } = useAdminTheme()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [role, setRole] = useState<StaffRole>('manager')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoError, setPhotoError] = useState<string | null>(null)
    const labelClassName = isDark ? 'text-gray-200' : 'text-gray-700'

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            const message = `Photo must be under ${MAX_UPLOAD_SIZE_LABEL}.`
            setPhotoError(message)
            setPhotoPreview(null)
            event.target.value = ''
            toast.error(message)
            return
        }

        setPhotoError(null)
        const reader = new FileReader()
        reader.onload = () => setPhotoPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Passwords do not match.')
            return
        }
        if (photoError) {
            toast.error(photoError)
            return
        }

        setLoading(true)
        try {
            const formData = new FormData(event.currentTarget)
            formData.set('role', role)

            const result = await createStaff(formData)

            if (result.error) {
                toast.error(result.error)
                setLoading(false)
                return
            }

            toast.success('Staff account created successfully.')
            router.push('/admin/staff')
            router.refresh()
        } catch {
            toast.error(UPLOAD_FAILURE_MESSAGE)
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Add Staff</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Create the auth user first, then save the staff profile in `profiles`.
                </p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
                <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.07)] sm:p-6">
                    <div>
                        <Label className={`mb-3 block ${labelClassName}`}>Profile Photo</Label>
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-100">
                                {photoPreview ? (
                                    <Image src={photoPreview} alt="Preview" width={64} height={64} className="h-full w-full object-cover" />
                                ) : (
                                    <ImageIcon className="h-6 w-6 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        Upload Photo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => cameraInputRef.current?.click()}
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        <Camera className="h-3.5 w-3.5" />
                                        Capture Photo
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">JPG, PNG or GIF (Max. {MAX_UPLOAD_SIZE_LABEL})</p>
                                {photoError ? <p className="mt-1 text-xs text-red-500">{photoError}</p> : null}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    name="photo"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                                <input
                                    ref={cameraInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="full_name" className={labelClassName}>Full Name</Label>
                            <Input
                                id="full_name"
                                name="full_name"
                                placeholder="Enter staff name"
                                required
                                disabled={loading}
                                className="h-11 rounded-xl border-slate-300"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className={labelClassName}>Phone</Label>
                            <Input
                                id="phone"
                                name="phone"
                                placeholder="Enter phone number"
                                required
                                disabled={loading}
                                className="h-11 rounded-xl border-slate-300"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="role" className={labelClassName}>Role</Label>
                            <Select value={role} onValueChange={(value) => setRole(value as StaffRole)} disabled={loading}>
                                <SelectTrigger id="role" className="h-11 rounded-xl border-slate-300">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STAFF_ROLES.map((staffRole) => (
                                        <SelectItem key={staffRole} value={staffRole}>
                                            {formatRoleLabel(staffRole)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email" className={labelClassName}>Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="staff@example.com"
                                required
                                disabled={loading}
                                autoComplete="off"
                                className="h-11 rounded-xl border-slate-300"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password" className={labelClassName}>Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Create a password"
                                required
                                minLength={6}
                                disabled={loading}
                                autoComplete="new-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="h-11 rounded-xl border-slate-300"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirm_password">Confirm Password</Label>
                            <Input
                                id="confirm_password"
                                name="confirm_password"
                                type="password"
                                placeholder="Re-enter the password"
                                required
                                minLength={6}
                                disabled={loading}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="h-11 rounded-xl border-slate-300"
                            />
                            {confirmPassword && password !== confirmPassword ? (
                                <p className="text-xs text-red-500">Passwords must match.</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-2xl border-slate-300"
                            disabled={loading}
                            onClick={() => router.push('/admin/staff')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="h-11 rounded-2xl bg-blue-600 px-6 text-white hover:bg-blue-700"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {loading ? 'Creating Staff...' : 'Create Staff'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}

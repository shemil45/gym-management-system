'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { STAFF_ROLES, formatRoleLabel, type StaffRole } from '@/lib/auth/roles'
import { updateStaff } from '@/app/admin/staff/actions'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, UPLOAD_FAILURE_MESSAGE } from '@/lib/constants/uploads'
import { Button } from '@/components/ui/button'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface EditStaffFormProps {
    staff: {
        id: string
        full_name: string
        phone: string | null
        photo_url: string | null
        role: StaffRole
    }
}

export default function EditStaffForm({ staff }: EditStaffFormProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [role, setRole] = useState<StaffRole>(staff.role)
    const [photoPreview, setPhotoPreview] = useState<string | null>(staff.photo_url)
    const [photoError, setPhotoError] = useState<string | null>(null)

    const initials = staff.full_name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            const message = `Photo must be under ${MAX_UPLOAD_SIZE_LABEL}.`
            setPhotoError(message)
            event.target.value = ''
            toast.error(message)
            return
        }

        setPhotoError(null)
        const reader = new FileReader()
        reader.onload = () => setPhotoPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (formData: FormData) => {
        if (photoError) {
            toast.error(photoError)
            return
        }

        setLoading(true)
        try {
            formData.set('id', staff.id)
            formData.set('role', role)
            formData.set('existing_photo_url', staff.photo_url || '')

            const result = await updateStaff(formData)

            if (result.error) {
                toast.error(result.error)
                setLoading(false)
                return
            }

            toast.success('Staff updated successfully')
            router.push(`/admin/staff/${staff.id}`)
        } catch {
            toast.error(UPLOAD_FAILURE_MESSAGE)
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="space-y-3">
                    <Label className="block">Profile Photo</Label>
                    <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-100">
                            {photoPreview ? (
                                <Image src={photoPreview} alt={staff.full_name} width={80} height={80} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-blue-600 text-lg font-semibold text-white">
                                    {initials}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                                <Upload className="mr-2 h-4 w-4" />
                                Change Photo
                            </Button>
                            <p className="text-xs text-gray-400">JPG, PNG or GIF up to {MAX_UPLOAD_SIZE_LABEL}</p>
                            {photoError ? <p className="text-xs text-red-500">{photoError}</p> : null}
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        name="photo"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                    />
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input id="full_name" name="full_name" defaultValue={staff.full_name} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" name="phone" defaultValue={staff.phone || ''} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Role</Label>
                        <Select value={role} onValueChange={(value) => setRole(value as StaffRole)} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue />
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
                </div>

                <div className="flex items-center gap-3">
                    <LoadingLinkButton href={`/admin/staff/${staff.id}`} loadingText="Leaving..." type="button" variant="outline" disabled={loading}>
                        Cancel
                    </LoadingLinkButton>
                    <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </form>
    )
}

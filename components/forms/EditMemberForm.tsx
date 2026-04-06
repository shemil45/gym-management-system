'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { updateMember } from '@/app/admin/members/actions'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, UPLOAD_FAILURE_MESSAGE } from '@/lib/constants/uploads'
import { Button } from '@/components/ui/button'
import LoadingLinkButton from '@/components/ui/loading-link-button'
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

interface EditMemberFormProps {
    member: {
        id: string
        full_name: string
        email: string | null
        phone: string
        photo_url: string | null
        date_of_birth: string | null
        gender: 'male' | 'female' | 'other' | null
        address: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
        membership_plan_id: string | null
        membership_start_date: string | null
        status: string
    }
    plans: { id: string; name: string }[]
}

export default function EditMemberForm({ member, plans }: EditMemberFormProps) {
    const router = useRouter()
    const { isDark } = useAdminTheme()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState(member.status)
    const [gender, setGender] = useState(member.gender || '')
    const [selectedPlan, setSelectedPlan] = useState(member.membership_plan_id || 'none')
    const [photoPreview, setPhotoPreview] = useState(member.photo_url)
    const [photoError, setPhotoError] = useState<string | null>(null)

    const initials = member.full_name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    const labelClassName = isDark ? 'text-gray-200' : 'text-gray-700'

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            const message = `Photo must be under ${MAX_UPLOAD_SIZE_LABEL}.`
            setPhotoError(message)
            e.target.value = ''
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
            formData.set('id', member.id)
            formData.set('status', status)
            formData.set('gender', gender)
            formData.set('membership_plan_id', selectedPlan === 'none' ? '' : selectedPlan)
            formData.set('existing_photo_url', member.photo_url || '')

            const result = await updateMember(formData)

            if (result.error) {
                toast.error(result.error)
                setLoading(false)
                return
            }

            toast.success('Member updated successfully')
            router.push(`/admin/members/${member.id}`)
        } catch {
            toast.error(UPLOAD_FAILURE_MESSAGE)
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 space-y-6">
                <div className="space-y-3">
                    <Label className={`block ${labelClassName}`}>Profile Photo</Label>
                    <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-100">
                            {photoPreview ? (
                                <Image src={photoPreview} alt={member.full_name} width={80} height={80} className="h-full w-full object-cover" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="full_name" className={labelClassName}>Full Name</Label>
                        <Input id="full_name" name="full_name" defaultValue={member.full_name} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="email" className={labelClassName}>Email</Label>
                        <Input id="email" name="email" type="email" defaultValue={member.email || ''} disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="phone" className={labelClassName}>Phone</Label>
                        <Input id="phone" name="phone" defaultValue={member.phone} required disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="date_of_birth" className={labelClassName}>Date of Birth</Label>
                        <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={member.date_of_birth || ''} disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClassName}>Gender</Label>
                        <Select value={gender || 'none'} onValueChange={(value) => setGender(value === 'none' ? '' : value)} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Not set</SelectItem>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClassName}>Status</Label>
                        <Select value={status} onValueChange={setStatus} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="frozen">Frozen</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="address" className={labelClassName}>Address</Label>
                        <textarea
                            id="address"
                            name="address"
                            defaultValue={member.address || ''}
                            rows={3}
                            disabled={loading}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-60 resize-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="emergency_contact_name" className={labelClassName}>Emergency Contact Name</Label>
                        <Input id="emergency_contact_name" name="emergency_contact_name" defaultValue={member.emergency_contact_name || ''} disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="emergency_contact_phone" className={labelClassName}>Emergency Contact Phone</Label>
                        <Input id="emergency_contact_phone" name="emergency_contact_phone" defaultValue={member.emergency_contact_phone || ''} disabled={loading} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClassName}>Membership Plan</Label>
                        <Select value={selectedPlan} onValueChange={setSelectedPlan} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No plan</SelectItem>
                                {plans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                        {plan.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="membership_start_date" className={labelClassName}>Membership Start Date</Label>
                        <Input
                            id="membership_start_date"
                            name="membership_start_date"
                            type="date"
                            defaultValue={member.membership_start_date || ''}
                            disabled={loading || selectedPlan === 'none'}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <LoadingLinkButton href={`/admin/members/${member.id}`} loadingText="Leaving..." type="button" variant="outline" disabled={loading}>
                        Cancel
                    </LoadingLinkButton>
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </form>
    )
}

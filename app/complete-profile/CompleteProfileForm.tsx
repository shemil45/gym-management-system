'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, ImageIcon, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { completeMemberProfile } from './actions'

export default function CompleteProfileForm() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(false)
    const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Photo must be under 5MB')
            return
        }
        const reader = new FileReader()
        reader.onload = () => setPhotoPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!gender) {
            toast.error('Please select a gender')
            return
        }

        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('gender', gender)

        const result = await completeMemberProfile(formData)

        if (result?.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success('Profile completed successfully!')
            // Force a full reload to bypass layout caching
            window.location.href = '/member/dashboard'
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 sm:p-8 space-y-8">
                
                {/* ── Profile Photo ── */}
                <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">Profile Photo</Label>
                    <div className="flex items-center gap-4">
                        {/* Avatar preview */}
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex-shrink-0">
                            {photoPreview ? (
                                <Image src={photoPreview} alt="Preview" width={64} height={64} className="h-full w-full object-cover" />
                            ) : (
                                <ImageIcon className="h-6 w-6 text-gray-400" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    Upload Photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                    Capture Photo
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">JPG, PNG or GIF (Max. 5MB)</p>
                            {/* Upload from gallery */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                name="photo"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                            />
                            {/* Capture from camera */}
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoChange}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Personal Info ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    {/* Date of Birth */}
                    <div className="space-y-1.5">
                        <Label htmlFor="date_of_birth" className="text-sm font-medium text-gray-700">
                            Date of Birth <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="date_of_birth"
                            name="date_of_birth"
                            type="date"
                            required
                            disabled={loading}
                            className="h-10 border-gray-300 text-sm text-gray-500"
                        />
                    </div>

                    {/* Gender — radio buttons */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                            Gender <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-6 pt-2">
                            {(['male', 'female', 'other'] as const).map((g) => (
                                <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="radio"
                                        name="gender_radio"
                                        value={g}
                                        checked={gender === g}
                                        onChange={() => setGender(g)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700 capitalize">{g}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                            Address <span className="text-red-500">*</span>
                        </Label>
                        <textarea
                            id="address"
                            name="address"
                            required
                            placeholder="Enter your full address"
                            disabled={loading}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-60 resize-y min-h-[80px]"
                        />
                    </div>
                </div>

                {/* ── Emergency Contact ── */}
                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-base font-bold text-gray-900 mb-4">Emergency Contact Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="emergency_contact_name" className="text-sm font-medium text-gray-700">
                                Contact Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="emergency_contact_name"
                                name="emergency_contact_name"
                                required
                                placeholder="Contact person name"
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emergency_contact_phone" className="text-sm font-medium text-gray-700">
                                Contact Phone <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="emergency_contact_phone"
                                name="emergency_contact_phone"
                                required
                                placeholder="(555) 123-4567"
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Action Buttons ── */}
                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm w-full sm:w-auto"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Complete Profile
                    </Button>
                </div>
            </div>
        </form>
    )
}

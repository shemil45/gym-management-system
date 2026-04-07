'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, ImageIcon, Camera, Gift, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { UpdateTables } from '@/lib/types'
import { completeMemberProfile } from './actions'

const MAX_SOURCE_FILE_BYTES = 5 * 1024 * 1024
const TARGET_IMAGE_BYTES = 300 * 1024
const MAX_IMAGE_WIDTH = 800
const DEFAULT_IMAGE_QUALITY = 0.7

type UploadedPhoto = {
    publicUrl: string
    path: string
}

async function fileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read the selected image.'))
        reader.readAsDataURL(file)
    })
}

async function loadImageDimensions(file: File) {
    const objectUrl = URL.createObjectURL(file)

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const nextImage = new window.Image()
            nextImage.onload = () => resolve(nextImage)
            nextImage.onerror = () => reject(new Error('Failed to load the selected image.'))
            nextImage.src = objectUrl
        })

        return {
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
            image,
        }
    } finally {
        URL.revokeObjectURL(objectUrl)
    }
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, type, quality)
    })
}

async function compressProfilePhoto(file: File) {
    const { image, width: originalWidth, height: originalHeight } = await loadImageDimensions(file)

    let currentWidth = Math.min(originalWidth, MAX_IMAGE_WIDTH)
    let currentHeight = Math.round((originalHeight / originalWidth) * currentWidth)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
        throw new Error('Image compression is not supported in this browser.')
    }

    let bestBlob: Blob | null = null
    let bestType = 'image/webp'
    const mimeTypeAttempts = ['image/webp', 'image/jpeg']
    const qualityAttempts = [DEFAULT_IMAGE_QUALITY, 0.65, 0.55, 0.45]

    for (let resizeStep = 0; resizeStep < 4; resizeStep += 1) {
        canvas.width = currentWidth
        canvas.height = currentHeight
        context.clearRect(0, 0, currentWidth, currentHeight)
        context.drawImage(image, 0, 0, currentWidth, currentHeight)

        for (const mimeType of mimeTypeAttempts) {
            for (const quality of qualityAttempts) {
                const blob = await canvasToBlob(canvas, mimeType, quality)

                if (!blob) {
                    continue
                }

                if (!bestBlob || blob.size < bestBlob.size) {
                    bestBlob = blob
                    bestType = mimeType
                }

                if (blob.size <= TARGET_IMAGE_BYTES) {
                    const extension = mimeType === 'image/webp' ? 'webp' : 'jpg'
                    const fileName = file.name.replace(/\.[^.]+$/, '') || 'profile-photo'
                    return new File([blob], `${fileName}.${extension}`, {
                        type: mimeType,
                        lastModified: Date.now(),
                    })
                }
            }
        }

        if (currentWidth <= 320) {
            break
        }

        currentWidth = Math.max(320, Math.round(currentWidth * 0.85))
        currentHeight = Math.max(1, Math.round((originalHeight / originalWidth) * currentWidth))
    }

    if (!bestBlob) {
        throw new Error('Failed to compress the selected image.')
    }

    if (bestBlob.size > TARGET_IMAGE_BYTES) {
        throw new Error('Unable to compress this image under 300KB. Please choose a smaller photo.')
    }

    const extension = bestType === 'image/webp' ? 'webp' : 'jpg'
    const fileName = file.name.replace(/\.[^.]+$/, '') || 'profile-photo'

    return new File([bestBlob], `${fileName}.${extension}`, {
        type: bestType,
        lastModified: Date.now(),
    })
}

export default function CompleteProfileForm() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(false)
    const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
    const [uploadedPhoto, setUploadedPhoto] = useState<UploadedPhoto | null>(null)
    const [photoError, setPhotoError] = useState('')
    const [loadingMessage, setLoadingMessage] = useState('')
    const [referralCode, setReferralCode] = useState('')
    const [referralStatus, setReferralStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
    const [referrerName, setReferrerName] = useState<string | null>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // Live referral code lookup (debounced)
    const lookupCode = useCallback(async (code: string) => {
        if (!code) { setReferralStatus('idle'); setReferrerName(null); return }
        setReferralStatus('checking')
        try {
            const res = await fetch(`/api/referral-lookup?code=${encodeURIComponent(code)}`)
            const json = await res.json()
            if (json.valid) {
                setReferralStatus('valid')
                setReferrerName(json.name)
            } else {
                setReferralStatus('invalid')
                setReferrerName(null)
            }
        } catch {
            setReferralStatus('idle')
        }
    }, [])

    const handleReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase()
        setReferralCode(val)
        setReferralStatus('idle')
        setReferrerName(null)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (val.length >= 3) {
            debounceRef.current = setTimeout(() => lookupCode(val), 500)
        }
    }

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > MAX_SOURCE_FILE_BYTES) {
            const message = 'Photo must be under 5MB before compression.'
            setPhotoError(message)
            setSelectedPhoto(null)
            setUploadedPhoto(null)
            setPhotoPreview(null)
            e.target.value = ''
            toast.error(message)
            return
        }
        setPhotoError('')
        setSelectedPhoto(file)
        setUploadedPhoto(null)
        void fileToDataUrl(file)
            .then((dataUrl) => setPhotoPreview(dataUrl))
            .catch(() => {
                setPhotoPreview(null)
                setSelectedPhoto(null)
                setPhotoError('Failed to preview the selected image.')
                toast.error('Failed to preview the selected image.')
            })
    }

    const uploadPhotoIfNeeded = async () => {
        if (!selectedPhoto) {
            return uploadedPhoto
        }

        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            throw new Error('Your session expired. Please sign in again.')
        }

        setLoadingMessage('Compressing photo...')
        let compressedPhoto: File

        try {
            compressedPhoto = await compressProfilePhoto(selectedPhoto)
        } catch {
            throw new Error('Photo compression failed. Please try a different image.')
        }

        const extension = compressedPhoto.type === 'image/webp' ? 'webp' : 'jpg'
        const filePath = `${user.id}/${Date.now()}.${extension}`

        setLoadingMessage('Uploading photo...')
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, compressedPhoto, {
                cacheControl: '3600',
                upsert: true,
                contentType: compressedPhoto.type,
            })

        if (uploadError) {
            throw new Error(uploadError.message || 'Failed to upload the compressed photo.')
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        const { error: profileError } = await supabase
            .from('profiles')
            .update(({ photo_url: publicUrl } satisfies UpdateTables<'profiles'>) as never)
            .eq('id', user.id)

        if (profileError) {
            await supabase.storage.from('avatars').remove([filePath])
            throw new Error(profileError.message || 'Failed to save the uploaded photo to your profile.')
        }

        setUploadedPhoto({ publicUrl, path: filePath })
        setSelectedPhoto(null)
        setPhotoPreview(publicUrl)

        return { publicUrl, path: filePath }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!gender) {
            toast.error('Please select a gender')
            return
        }
        if (referralCode && referralStatus === 'invalid') {
            toast.error('The referral code you entered is invalid. Please fix or clear it.')
            return
        }

        setLoading(true)
        setLoadingMessage('Saving profile...')

        try {
            let photo = uploadedPhoto
            if (selectedPhoto) {
                photo = await uploadPhotoIfNeeded()
            }

            const formData = new FormData(e.currentTarget)
            formData.delete('photo')
            formData.append('gender', gender)
            if (referralCode && referralStatus === 'valid') {
                formData.append('referral_code', referralCode)
            }
            if (photo?.publicUrl) {
                formData.append('photo_url', photo.publicUrl)
            }

            const result = await completeMemberProfile(formData)

            if (result?.error) {
                toast.error(result.error)
                setLoading(false)
                setLoadingMessage('')
            } else {
                toast.success('Profile completed successfully!')
                // Force a full reload to bypass layout caching
                window.location.href = '/member/dashboard'
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload your profile photo.'
            setPhotoError(message)
            toast.error(message)
            setLoading(false)
            setLoadingMessage('')
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
                                    disabled={loading}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    {loading && loadingMessage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                    Upload Photo
                                </button>
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                    Capture Photo
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                                {loadingMessage || 'JPG, PNG or GIF (Max. 5MB)'}
                            </p>
                            {photoError ? <p className="mt-1 text-xs text-red-500">{photoError}</p> : null}
                            {/* Upload from gallery */}
                            <input
                                ref={fileInputRef}
                                type="file"
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

                    {/* Referral Code */}
                    <div className="space-y-1.5">
                        <Label htmlFor="referral_code" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <Gift className="h-3.5 w-3.5 text-orange-500" />
                            Referral Code
                            <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                        </Label>

                        {/* Referrer name preview */}
                        {referralStatus === 'valid' && referrerName && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                Referred by <span className="font-semibold">{referrerName}</span>
                            </div>
                        )}
                        {referralStatus === 'invalid' && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                No member found with this code
                            </div>
                        )}

                        <div className="relative">
                            <Input
                                id="referral_code"
                                name="referral_code_display"
                                type="text"
                                placeholder="e.g. GYM001"
                                value={referralCode}
                                onChange={handleReferralChange}
                                disabled={loading}
                                className={`h-10 text-sm font-mono tracking-widest pr-8 border ${
                                    referralStatus === 'valid'
                                        ? 'border-emerald-400 focus-visible:ring-emerald-300'
                                        : referralStatus === 'invalid'
                                        ? 'border-red-400 focus-visible:ring-red-300'
                                        : 'border-gray-300'
                                }`}
                                style={{ textTransform: 'uppercase' }}
                            />
                            {referralStatus === 'checking' && (
                                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                            )}
                        </div>
                        <p className="text-xs text-gray-400">Got a code from a friend? Enter their member ID here.</p>
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
                        {loadingMessage || 'Complete Profile'}
                    </Button>
                </div>
            </div>
        </form>
    )
}

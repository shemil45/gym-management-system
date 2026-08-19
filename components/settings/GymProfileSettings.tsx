'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Building2, Camera, ImageIcon, Loader2, MapPin, Receipt, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { updateGymProfile } from '@/app/admin/settings/gym-profile/actions'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, UPLOAD_FAILURE_MESSAGE } from '@/lib/constants/uploads'
import { createImagePreviewUrl, removeUploadedAvatar, uploadCompressedAvatar } from '@/lib/utils/client-image-upload'

interface GymProfileSettingsProps {
    gym: {
        name: string
        logo_url: string | null
        contact_phone: string | null
        contact_email: string | null
        website: string | null
        address: string | null
        city: string | null
        state: string | null
        postal_code: string | null
        country: string | null
        gstin: string | null
    }
}

export default function GymProfileSettings({ gym }: GymProfileSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const [pending, startTransition] = useTransition()
    const [saving, setSaving] = useState(false)

    const [name, setName] = useState(gym.name)
    const [nameTouched, setNameTouched] = useState(false)
    const [phone, setPhone] = useState(gym.contact_phone ?? '')
    const [email, setEmail] = useState(gym.contact_email ?? '')
    const [website, setWebsite] = useState(gym.website ?? '')
    const [address, setAddress] = useState(gym.address ?? '')
    const [city, setCity] = useState(gym.city ?? '')
    const [state, setState] = useState(gym.state ?? '')
    const [postalCode, setPostalCode] = useState(gym.postal_code ?? '')
    const [country, setCountry] = useState(gym.country ?? '')
    const [gstin, setGstin] = useState(gym.gstin ?? '')

    const [logoPreview, setLogoPreview] = useState<string | null>(gym.logo_url)
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null)
    const [logoError, setLogoError] = useState<string | null>(null)
    const [loadingMessage, setLoadingMessage] = useState('')

    const nameError = nameTouched && name.trim() === '' ? 'Gym name is required' : null

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            const message = `Logo must be under ${MAX_UPLOAD_SIZE_LABEL}.`
            setLogoError(message)
            setSelectedLogo(null)
            e.target.value = ''
            toast.error(message)
            return
        }
        setLogoError(null)
        setSelectedLogo(file)
        void createImagePreviewUrl(file)
            .then((previewUrl) => setLogoPreview(previewUrl))
            .catch(() => {
                setSelectedLogo(null)
                setLogoError('Failed to preview the selected image.')
                toast.error('Failed to preview the selected image.')
            })
    }

    const cardClass = `rounded-xl p-6 ${
        isDark
            ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
            : 'border border-gray-200 bg-white shadow-sm'
    }`
    const inputClass = (hasError: boolean) => `h-10 text-sm ${
        hasError
            ? 'border-red-400 focus:ring-red-400'
            : isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'
    }`
    const labelClass = `text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setNameTouched(true)
        if (name.trim() === '') return
        if (logoError) { toast.error(logoError); return }
        if (saving) return
        setSaving(true)

        setLoadingMessage('Saving...')
        let uploadedLogoPath: string | null = null

        try {
            let logoUrl = gym.logo_url

            if (selectedLogo) {
                setLoadingMessage('Uploading logo...')
                const uploadedLogo = await uploadCompressedAvatar(selectedLogo, 'gym-logo', {
                    onStatusChange: setLoadingMessage,
                })
                uploadedLogoPath = uploadedLogo.path
                logoUrl = uploadedLogo.publicUrl
                setLoadingMessage('Saving...')
            }

            const fd = new FormData()
            fd.append('name', name)
            fd.append('logo_url', logoUrl ?? '')
            fd.append('previous_logo_url', gym.logo_url ?? '')
            fd.append('contact_phone', phone)
            fd.append('contact_email', email)
            fd.append('website', website)
            fd.append('address', address)
            fd.append('city', city)
            fd.append('state', state)
            fd.append('postal_code', postalCode)
            fd.append('country', country)
            fd.append('gstin', gstin)

            startTransition(async () => {
                const result = await updateGymProfile(fd)
                if ('error' in result) {
                    if (uploadedLogoPath) await removeUploadedAvatar(uploadedLogoPath)
                    toast.error(result.error)
                } else {
                    toast.success('Gym profile saved')
                    setSelectedLogo(null)
                    router.refresh()
                }
                setLoadingMessage('')
                setSaving(false)
            })
        } catch (error) {
            if (uploadedLogoPath) await removeUploadedAvatar(uploadedLogoPath)
            toast.error(error instanceof Error ? error.message : UPLOAD_FAILURE_MESSAGE)
            setLoadingMessage('')
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Gym Profile</h1>
                <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Name, logo, address, and contact details for your gym.
                </p>
            </div>

            {/* Basic Information */}
            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Building2 className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Basic Information</h2>
                </div>

                <div className="mb-5">
                    <Label className={`mb-3 block ${labelClass}`}>Gym Logo</Label>
                    <div className="flex items-center gap-4">
                        <div className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dashed flex-shrink-0 ${
                            isDark ? 'bg-[#161616] border-[#2a2a2a]' : 'bg-gray-100 border-gray-300'
                        }`}>
                            {logoPreview ? (
                                <Image src={logoPreview} alt="Gym logo preview" width={64} height={64} className="h-full w-full object-cover" />
                            ) : (
                                <ImageIcon className={`h-6 w-6 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={pending || saving}
                                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                                        isDark
                                            ? 'border border-[#2a2a2a] bg-[#161616] text-gray-200 hover:bg-[#222222] hover:text-white'
                                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    Upload Logo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    disabled={pending || saving}
                                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                                        isDark
                                            ? 'border border-[#2a2a2a] bg-[#161616] text-gray-200 hover:bg-[#222222] hover:text-white'
                                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                    Capture
                                </button>
                            </div>
                            <p className={`mt-1 text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>JPG, PNG or GIF (Max. {MAX_UPLOAD_SIZE_LABEL})</p>
                            {logoError ? <p className="mt-1 text-xs text-red-500">{logoError}</p> : null}
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handleLogoChange} className="hidden" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className={labelClass}>Gym Name <span className="text-red-500">*</span></Label>
                        <Input
                            value={name}
                            onChange={(e) => { setName(e.target.value); setNameTouched(true) }}
                            placeholder="Your gym's name"
                            disabled={pending || saving}
                            className={inputClass(!!nameError)}
                        />
                        {nameError ? <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span> {nameError}</p> : null}
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>Phone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" disabled={pending || saving} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>Email</Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="gym@example.com" disabled={pending || saving} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className={labelClass}>Website</Label>
                        <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" disabled={pending || saving} className={inputClass(false)} />
                    </div>
                </div>
            </div>

            {/* Address */}
            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <MapPin className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Address</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className={labelClass}>Address</Label>
                        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" disabled={pending || saving} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>City</Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={pending || saving} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>State</Label>
                        <Input value={state} onChange={(e) => setState(e.target.value)} disabled={pending || saving} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>PIN/ZIP Code</Label>
                        <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={pending || saving} className={inputClass(false)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={labelClass}>Country</Label>
                        <Input value={country} onChange={(e) => setCountry(e.target.value)} disabled={pending || saving} className={inputClass(false)} />
                    </div>
                </div>
            </div>

            {/* Business */}
            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Receipt className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Business</h2>
                </div>
                <div className="max-w-xs space-y-1.5">
                    <Label className={labelClass}>GSTIN</Label>
                    <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" disabled={pending || saving} className={inputClass(false)} />
                </div>
            </div>

            <div>
                <Button
                    type="submit"
                    disabled={pending || saving}
                    className={`h-10 px-6 font-semibold shadow-sm ${
                        isDark ? 'bg-[#10b981] hover:bg-[#0ea271] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loadingMessage || 'Save Changes'}
                </Button>
            </div>
        </form>
    )
}

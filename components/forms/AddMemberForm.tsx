'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload, ImageIcon, Camera } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { createMember } from '@/app/admin/members/actions'

interface AddMemberFormProps {
    plans: { id: string; name: string; duration_days: number; price: number }[]
}

export default function AddMemberForm({ plans }: AddMemberFormProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')

    const selectedPlanDetails = plans.find((p) => p.id === selectedPlan)

    // Auto-fill amount when plan is chosen
    const handlePlanChange = (value: string) => {
        setSelectedPlan(value)
        const plan = plans.find((p) => p.id === value)
        if (plan) setPaymentAmount(String(plan.price))
    }

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
        if (!selectedPlan) { toast.error('Please select a membership plan'); return }
        if (!paymentMethod) { toast.error('Please select a payment method'); return }

        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('membership_plan_id', selectedPlan)
        formData.append('payment_method', paymentMethod)
        formData.append('gender', gender)

        const result = await createMember(formData)

        if (result.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success('Member added successfully!')
            router.push(`/admin/members/${result.memberId}`)
        }
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <h1 className="text-3xl font-bold text-gray-900">Add New Member</h1>

            <form onSubmit={handleSubmit}>
                {/* Single white card */}
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 space-y-6">

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
                                    capture="user"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Personal Info ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                                Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="full_name"
                                name="full_name"
                                placeholder="Enter full name"
                                required
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="email@example.com"
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                                Phone Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="phone"
                                name="phone"
                                placeholder="(555) 123-4567"
                                required
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>

                        {/* Date of Birth */}
                        <div className="space-y-1.5">
                            <Label htmlFor="date_of_birth" className="text-sm font-medium text-gray-700">Date of Birth</Label>
                            <Input
                                id="date_of_birth"
                                name="date_of_birth"
                                type="date"
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm text-gray-500"
                            />
                        </div>

                        {/* Gender — radio buttons */}
                        <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-sm font-medium text-gray-700">Gender</Label>
                            <div className="flex items-center gap-6 pt-1">
                                {(['male', 'female', 'other'] as const).map((g) => (
                                    <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="gender_radio"
                                            value={g}
                                            checked={gender === g}
                                            onChange={() => setGender(g)}
                                            className="h-4 w-4 accent-blue-600"
                                        />
                                        <span className="text-sm text-gray-700 capitalize">{g}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address</Label>
                            <textarea
                                id="address"
                                name="address"
                                placeholder="Enter full address"
                                disabled={loading}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-60 resize-none"
                            />
                        </div>
                    </div>

                    {/* ── Emergency Contact ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="emergency_contact_name" className="text-sm font-medium text-gray-700">
                                Emergency Contact Name
                            </Label>
                            <Input
                                id="emergency_contact_name"
                                name="emergency_contact_name"
                                placeholder="Contact person name"
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emergency_contact_phone" className="text-sm font-medium text-gray-700">
                                Emergency Contact Phone
                            </Label>
                            <Input
                                id="emergency_contact_phone"
                                name="emergency_contact_phone"
                                placeholder="(555) 123-4567"
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>
                    </div>

                    {/* ── Membership Plan + Start Date ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700">
                                Membership Plan <span className="text-red-500">*</span>
                            </Label>
                            <Select value={selectedPlan} onValueChange={handlePlanChange} disabled={loading}>
                                <SelectTrigger className="h-10 border-gray-300 text-sm text-gray-700">
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id}>
                                            {plan.name} — ₹{plan.price} ({plan.duration_days}d)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="membership_start_date" className="text-sm font-medium text-gray-700">
                                Start Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="membership_start_date"
                                name="membership_start_date"
                                type="date"
                                required
                                disabled={loading}
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="h-10 border-gray-300 text-sm text-gray-600"
                            />
                        </div>
                    </div>

                    {/* ── Payment Information (divider section) ── */}
                    <div className="border-t border-gray-200 pt-5 space-y-4">
                        <h2 className="text-base font-bold text-gray-900">Payment Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Amount */}
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_amount" className="text-sm font-medium text-gray-700">Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                                    <Input
                                        id="payment_amount"
                                        name="payment_amount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        disabled={loading}
                                        className="h-10 pl-7 border-gray-300 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-gray-700">
                                    Payment Method <span className="text-red-500">*</span>
                                </Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={loading}>
                                    <SelectTrigger className="h-10 border-gray-300 text-sm text-gray-700">
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="upi">UPI</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* ── Action Buttons ── */}
                    <div className="flex items-center gap-3 pt-1">
                        <Link href="/admin/members">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={loading}
                                className="h-10 px-5 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Member
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}

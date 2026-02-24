'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Loader2, Search, ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { recordPayment } from '@/app/admin/payments/actions'

interface MemberOption {
    id: string
    member_id: string
    full_name: string
    photo_url?: string | null
    status: string
    membership_plan?: { id: string; name: string; price: number } | null
}

interface PlanOption {
    id: string
    name: string
    price: number
    duration_days: number
}

interface RecordPaymentFormProps {
    members: MemberOption[]
    plans: PlanOption[]
}

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function RecordPaymentForm({ members, plans }: RecordPaymentFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form state
    const [memberSearch, setMemberSearch] = useState('')
    const [selectedMemberId, setSelectedMemberId] = useState('')
    const [amount, setAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [paymentStatus, setPaymentStatus] = useState('paid')
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedPlanId, setSelectedPlanId] = useState('')
    const [renewMembership, setRenewMembership] = useState(false)
    const [notes, setNotes] = useState('')

    // Member selector state
    const [showMemberDropdown, setShowMemberDropdown] = useState(false)

    const filteredMembers = members.filter((m) => {
        const q = memberSearch.toLowerCase()
        return m.full_name.toLowerCase().includes(q) || m.member_id.toLowerCase().includes(q)
    })

    const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null

    const handleMemberSelect = (member: MemberOption) => {
        setSelectedMemberId(member.id)
        setMemberSearch(member.full_name)
        setShowMemberDropdown(false)
        // Pre-fill plan if member has one
        if (member.membership_plan) {
            const matchingPlan = plans.find((p) => p.id === member.membership_plan?.id)
            if (matchingPlan) {
                setSelectedPlanId(matchingPlan.id)
                setAmount(String(matchingPlan.price))
            }
        }
    }

    const handlePlanChange = (planId: string) => {
        setSelectedPlanId(planId)
        const plan = plans.find((p) => p.id === planId)
        if (plan) setAmount(String(plan.price))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedMemberId) { toast.error('Please select a member'); return }
        if (!amount || isNaN(parseFloat(amount))) { toast.error('Please enter a valid amount'); return }
        if (!paymentMethod) { toast.error('Please select a payment method'); return }

        setLoading(true)
        const formData = new FormData()
        formData.append('member_id', selectedMemberId)
        formData.append('amount', amount)
        formData.append('payment_method', paymentMethod)
        formData.append('payment_status', paymentStatus)
        formData.append('payment_date', paymentDate)
        if (selectedPlanId) formData.append('plan_id', selectedPlanId)
        formData.append('renew_membership', String(renewMembership))
        formData.append('notes', notes)

        const result = await recordPayment(formData)

        if (result.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success(`Payment recorded! Invoice: ${result.invoiceNumber}`)
            router.push('/admin/payments')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin/payments">
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Record Payment</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Add a new payment record for a member</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 space-y-6">

                    {/* ── Member Selection ── */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                            Member <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by name or member ID..."
                                value={memberSearch}
                                onChange={(e) => {
                                    setMemberSearch(e.target.value)
                                    setSelectedMemberId('')
                                    setShowMemberDropdown(true)
                                }}
                                onFocus={() => setShowMemberDropdown(true)}
                                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-colors"
                            />
                            {showMemberDropdown && memberSearch && (
                                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg divide-y divide-gray-100">
                                    {filteredMembers.length === 0 ? (
                                        <p className="py-4 text-center text-xs text-gray-400">No members found</p>
                                    ) : (
                                        filteredMembers.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => handleMemberSelect(m)}
                                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors"
                                            >
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarImage src={m.photo_url || undefined} />
                                                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-[10px] font-semibold">
                                                        {getInitials(m.full_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-medium text-gray-800">{m.full_name}</p>
                                                    <p className="text-[10px] text-gray-400">{m.member_id} · {m.status}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected member chip */}
                        {selectedMember && (
                            <div className="flex items-center gap-2 mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={selectedMember.photo_url || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-[9px] font-semibold">
                                        {getInitials(selectedMember.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-medium text-emerald-800">{selectedMember.full_name}</p>
                                <span className="text-xs text-emerald-600">·</span>
                                <p className="text-xs text-emerald-600">{selectedMember.member_id}</p>
                                {selectedMember.membership_plan && (
                                    <>
                                        <span className="text-xs text-emerald-600">·</span>
                                        <p className="text-xs text-emerald-600">{selectedMember.membership_plan.name}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Payment Details ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {/* Amount */}
                        <div className="space-y-1.5">
                            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                                Amount <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                                <Input
                                    id="amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    disabled={loading}
                                    className="h-10 pl-7 border-gray-300 text-sm focus:border-emerald-400 focus:ring-emerald-400"
                                />
                            </div>
                        </div>

                        {/* Payment Date */}
                        <div className="space-y-1.5">
                            <Label htmlFor="payment_date" className="text-sm font-medium text-gray-700">
                                Payment Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="payment_date"
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                disabled={loading}
                                className="h-10 border-gray-300 text-sm text-gray-600 focus:border-emerald-400 focus:ring-emerald-400"
                            />
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700">
                                Payment Method <span className="text-red-500">*</span>
                            </Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={loading}>
                                <SelectTrigger className="h-10 border-gray-300 text-sm text-gray-700 focus:border-emerald-400">
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="online">Online</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Payment Status */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-gray-700">Payment Status</Label>
                            <Select value={paymentStatus} onValueChange={setPaymentStatus} disabled={loading}>
                                <SelectTrigger className="h-10 border-gray-300 text-sm text-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ── Membership Renewal ── */}
                    <div className="border-t border-gray-100 pt-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="renew_membership"
                                checked={renewMembership}
                                onChange={(e) => setRenewMembership(e.target.checked)}
                                disabled={loading}
                                className="mt-0.5 h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                            />
                            <div>
                                <label htmlFor="renew_membership" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                                    Renew / Update Membership
                                </label>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    This will update the member&apos;s plan, start date, and expiry date
                                </p>
                            </div>
                        </div>

                        {renewMembership && (
                            <div className="ml-7">
                                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                                    Membership Plan
                                </Label>
                                <Select value={selectedPlanId} onValueChange={handlePlanChange} disabled={loading}>
                                    <SelectTrigger className="h-10 border-gray-300 text-sm text-gray-700 max-w-sm">
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
                        )}
                    </div>

                    {/* ── Notes ── */}
                    <div className="space-y-1.5">
                        <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                            Notes <span className="text-gray-400 font-normal">(optional)</span>
                        </Label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Add any notes about this payment..."
                            disabled={loading}
                            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-60"
                        />
                    </div>

                    {/* ── Action Buttons ── */}
                    <div className="flex items-center gap-3 pt-1">
                        <Link href="/admin/payments">
                            <Button type="button" variant="outline" disabled={loading} className="h-10 px-5 border-gray-300 text-gray-700 hover:bg-gray-50">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Payment
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}

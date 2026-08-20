'use client'

import { useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { Loader2, Search, ArrowLeft, RefreshCw, PencilLine, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { recordPayment } from '@/app/admin/finances/payments/actions'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'

interface MemberOption {
    id: string
    member_id: string
    full_name: string
    photo_url?: string | null
    status: string
    membership_expiry_date?: string | null
    membership_plan?: { id: string; name: string; price: number; duration_days: number } | null
}

interface PlanOption {
    id: string
    name: string
    price: number
    duration_days: number
}

interface PaymentMethodOption {
    value: string
    label: string
}

interface RecordPaymentFormProps {
    members: MemberOption[]
    plans: PlanOption[]
    paymentMethods: PaymentMethodOption[]
    defaultPaymentMethod?: string
}

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function RecordPaymentForm({ members, plans, paymentMethods, defaultPaymentMethod = '' }: RecordPaymentFormProps) {
    const router = useRouter()
    const { isDark } = useAdminTheme()
    const [loading, setLoading] = useState(false)
    const today = new Date().toISOString().split('T')[0]

    // Form state
    const [memberSearch, setMemberSearch] = useState('')
    const [selectedMemberId, setSelectedMemberId] = useState('')
    const [amount, setAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod)
    const [paymentStatus, setPaymentStatus] = useState('paid')
    const [paymentDate, setPaymentDate] = useState(today)
    const [selectedPlanId, setSelectedPlanId] = useState('')
    const [membershipMode, setMembershipMode] = useState<'renew' | 'change'>('renew')
    const [notes, setNotes] = useState('')

    // Member selector state
    const [showMemberDropdown, setShowMemberDropdown] = useState(false)
    const [navigatingBack, setNavigatingBack] = useState(false)

    const handleBack = () => {
        setNavigatingBack(true)
        startTransition(() => {
            router.push('/admin/finances/payments')
        })
    }

    const filteredMembers = members.filter((m) => {
        const q = memberSearch.toLowerCase()
        return m.full_name.toLowerCase().includes(q) || m.member_id.toLowerCase().includes(q)
    })

    const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null

    const handleMemberSelect = (member: MemberOption) => {
        setSelectedMemberId(member.id)
        setMemberSearch(member.full_name)
        setShowMemberDropdown(false)
        // Default to renewing the member's current plan; if they have none, staff must pick one
        if (member.membership_plan) {
            setMembershipMode('renew')
            setSelectedPlanId(member.membership_plan.id)
            setAmount(String(member.membership_plan.price))
        } else {
            setMembershipMode('change')
            setSelectedPlanId('')
            setAmount('')
        }
    }

    const handlePlanChange = (planId: string) => {
        setSelectedPlanId(planId)
        const plan = plans.find((p) => p.id === planId)
        if (plan) setAmount(String(plan.price))
    }

    const handleRenewMode = () => {
        setMembershipMode('renew')
        if (selectedMember?.membership_plan) {
            setSelectedPlanId(selectedMember.membership_plan.id)
            setAmount(String(selectedMember.membership_plan.price))
        }
    }

    const handleChangePlanMode = () => {
        setMembershipMode('change')
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedMemberId) { toast.error('Please select a member'); return }
        if (paymentDate > today) { toast.error('Payment date cannot be in the future'); return }
        if (!selectedPlanId) { toast.error('Please select a membership plan'); return }
        if (!amount || isNaN(parseFloat(amount))) { toast.error('Please enter a valid amount'); return }
        if (!paymentMethod) { toast.error('Please select a payment method'); return }

        setLoading(true)
        const formData = new FormData()
        formData.append('member_id', selectedMemberId)
        formData.append('amount', amount)
        formData.append('payment_method', paymentMethod)
        formData.append('payment_status', paymentStatus)
        formData.append('payment_date', paymentDate)
        formData.append('plan_id', selectedPlanId)
        formData.append('renew_membership', 'true')
        formData.append('notes', notes)

        const result = await recordPayment(formData)

        if (result.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success(`Payment recorded! Invoice: ${result.invoiceNumber}`)
            if (result.notificationWarning) {
                toast.warning(result.notificationWarning, {
                    duration: 7000,
                })
            }
            router.push('/admin/finances/payments')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={handleBack}
                    disabled={navigatingBack || loading}
                    type="button"
                    variant="outline"
                    className="h-9 w-9 border-gray-200 bg-white px-0 text-gray-500 hover:bg-gray-50 hover:text-gray-800 shrink-0"
                >
                    {navigatingBack ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
                </Button>
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

                    {/* ── Membership ── */}
                    {selectedMember && (
                        <div className="border-t border-gray-100 pt-5 space-y-4">
                            <Label className="text-sm font-medium text-gray-700">Membership</Label>

                            {/* Current plan summary */}
                            {selectedMember.membership_plan ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Current Plan</p>
                                        <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedMember.membership_plan.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Price</p>
                                        <p className="text-sm font-medium text-gray-800 mt-0.5">₹{selectedMember.membership_plan.price}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Duration</p>
                                        <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedMember.membership_plan.duration_days} days</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Current Expiry</p>
                                        <p className="text-sm font-medium text-gray-800 mt-0.5 flex items-center gap-1">
                                            <Calendar className="h-3 w-3 text-gray-400" />
                                            {formatDate(selectedMember.membership_expiry_date)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                    This member has no active plan. Choose a plan below to start their membership.
                                </p>
                            )}

                            {/* Renew vs Change Plan */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleRenewMode}
                                    disabled={loading || !selectedMember.membership_plan}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                        membershipMode === 'renew'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Renew Membership
                                </button>
                                <button
                                    type="button"
                                    onClick={handleChangePlanMode}
                                    disabled={loading}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                        membershipMode === 'change'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <PencilLine className="h-3.5 w-3.5" />
                                    Change Plan
                                </button>
                            </div>

                            {membershipMode === 'renew' ? (
                                <p className="text-xs text-gray-400">Renew using the member&apos;s current plan.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    <p className="text-xs text-amber-600">
                                        The member will be switched to a different plan.
                                    </p>
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
                    )}

                    {/* ── Payment Details ── */}
                    <div className="border-t border-gray-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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
                                max={today}
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
                                    {paymentMethods.map((method) => (
                                        <SelectItem key={method.value} value={method.value}>
                                            {method.label}
                                        </SelectItem>
                                    ))}
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
                        <Button
                            onClick={handleBack}
                            type="button"
                            variant="outline"
                            disabled={navigatingBack || loading}
                            className={`h-10 px-5 ${
                                isDark
                                    ? 'border-[#2a2a2a] bg-[#161616] text-gray-200 hover:bg-[#222222] hover:text-white'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {navigatingBack ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {navigatingBack ? 'Leaving...' : 'Cancel'}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Payment
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { CheckCircle2, Zap, Star, Crown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { purchasePlan } from './actions'

interface Plan {
    id: string
    name: string
    price: number
    duration_days: number
    description: string | null
    features: string[] | null
    is_active: boolean
}

interface PlansClientProps {
    plans: Plan[]
    currentPlanId: string | null
    membershipExpiry: string | null
    memberStatus: string
}

const PAYMENT_METHODS = [
    { value: 'upi', label: 'UPI' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
]

const planIcon = (index: number) => {
    const icons = [Zap, Star, Crown]
    return icons[index % icons.length]
}

const planColors = [
    { bg: 'from-blue-500 to-blue-700', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200', ring: 'ring-blue-400' },
    { bg: 'from-emerald-500 to-emerald-700', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-400' },
    { bg: 'from-violet-500 to-violet-700', badge: 'bg-violet-100 text-violet-700', border: 'border-violet-200', ring: 'ring-violet-400' },
]

export default function PlansClient({ plans, currentPlanId, membershipExpiry, memberStatus }: PlansClientProps) {
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
    const [paymentMethod, setPaymentMethod] = useState('upi')
    const [loading, setLoading] = useState(false)

    const isActive = memberStatus === 'active'
    const expiryDate = membershipExpiry ? new Date(membershipExpiry) : null
    const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

    const handlePurchase = async () => {
        if (!selectedPlanId) { toast.error('Please select a plan'); return }
        setLoading(true)
        const result = await purchasePlan(selectedPlanId, paymentMethod)
        setLoading(false)
        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success(`Plan purchased! Invoice: ${result.invoiceNumber}. An admin will confirm your payment.`)
            setSelectedPlanId(null)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
                <p className="text-sm text-gray-500 mt-1">Choose a plan and start your fitness journey.</p>
            </div>

            {/* Current status banner */}
            {isActive && expiryDate && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-emerald-800">You have an active membership</p>
                        <p className="text-xs text-emerald-600">
                            Expires on {expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {daysLeft > 0 ? ` (${daysLeft} days left)` : ' — Expired'}
                        </p>
                    </div>
                </div>
            )}

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {plans.map((plan, idx) => {
                    const color = planColors[idx % planColors.length]
                    const Icon = planIcon(idx)
                    const isSelected = selectedPlanId === plan.id
                    const isCurrent = currentPlanId === plan.id && isActive

                    return (
                        <div
                            key={plan.id}
                            onClick={() => !loading && setSelectedPlanId(plan.id)}
                            className={`relative rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden
                                ${isSelected ? `${color.border} ring-2 ${color.ring} shadow-lg` : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
                            `}
                        >
                            {/* Header gradient */}
                            <div className={`bg-gradient-to-br ${color.bg} px-6 py-5`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    {isCurrent && (
                                        <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-1 rounded-full">
                                            Current
                                        </span>
                                    )}
                                    {isSelected && !isCurrent && (
                                        <CheckCircle2 className="h-6 w-6 text-white" />
                                    )}
                                </div>
                                <div className="mt-3">
                                    <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                                    <p className="text-sm text-white/70">{plan.duration_days} days</p>
                                </div>
                                <div className="mt-2">
                                    <span className="text-3xl font-extrabold text-white">₹{plan.price.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="bg-white px-6 py-4 space-y-2">
                                {plan.description && (
                                    <p className="text-sm text-gray-600">{plan.description}</p>
                                )}
                                {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                                    <ul className="space-y-1 mt-2">
                                        {(plan.features as string[]).map((f, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Purchase section — only shown when a plan is selected */}
            {selectedPlanId && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
                    <h2 className="text-base font-bold text-gray-900">Confirm Purchase</h2>
                    <p className="text-sm text-gray-500">
                        Your plan will be confirmed after an admin verifies your payment.
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Payment Method</label>
                        <div className="flex flex-wrap gap-2">
                            {PAYMENT_METHODS.map((m) => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => setPaymentMethod(m.value)}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all
                                        ${paymentMethod === m.value
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setSelectedPlanId(null)}
                            disabled={loading}
                            className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handlePurchase}
                            disabled={loading}
                            className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm Purchase
                        </button>
                    </div>
                </div>
            )}

            {plans.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg font-medium">No plans available</p>
                    <p className="text-sm mt-1">Check back later or contact your gym administrator.</p>
                </div>
            )}
        </div>
    )
}

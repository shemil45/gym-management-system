'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    CreditCard,
    Plus,
    Pencil,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Loader2,
    X,
    Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { createPlan, updatePlan, togglePlanStatus, deletePlan } from '@/app/admin/plans/actions'
import { formatCurrency } from '@/lib/utils/currency'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
    id: string
    name: string
    price: number
    duration_days: number
    description: string | null
    is_active: boolean
    features: unknown
}

// ─── Plan Form Modal ──────────────────────────────────────────────────────────

function PlanModal({ plan, onClose }: { plan?: Plan | null; onClose: () => void }) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const isEdit = !!plan

    const [name, setName] = useState(plan?.name ?? '')
    const [price, setPrice] = useState(String(plan?.price ?? ''))
    const [days, setDays] = useState(String(plan?.duration_days ?? ''))
    const [desc, setDesc] = useState(plan?.description ?? '')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const fd = new FormData()
        if (isEdit) fd.append('id', plan!.id)
        fd.append('name', name)
        fd.append('price', price)
        fd.append('duration_days', days)
        fd.append('description', desc)

        startTransition(async () => {
            const result = isEdit ? await updatePlan(fd) : await createPlan(fd)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(isEdit ? 'Plan updated' : 'Plan created')
                router.refresh()
                onClose()
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            {isEdit ? 'Edit Plan' : 'Create New Plan'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-700">
                            Plan Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Monthly Plan"
                            className="h-10 border-gray-300 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">
                                Price (₹) <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="h-10 pl-7 border-gray-300 text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">
                                Duration (days) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                min="1"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                placeholder="30"
                                className="h-10 border-gray-300 text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-700">Description</Label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            rows={2}
                            placeholder="Brief description of what's included..."
                            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={pending}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            {isEdit ? 'Save Changes' : 'Create Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PlansManager({ plans }: { plans: Plan[] }) {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleToggle = async (plan: Plan) => {
        setTogglingId(plan.id)
        const result = await togglePlanStatus(plan.id, !plan.is_active)
        if (result.error) toast.error(result.error)
        else { toast.success(plan.is_active ? 'Plan deactivated' : 'Plan activated'); router.refresh() }
        setTogglingId(null)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this plan? Members on this plan will keep their existing membership.')) return
        setDeletingId(id)
        const result = await deletePlan(id)
        if (result.error) toast.error(result.error)
        else { toast.success('Plan deleted'); router.refresh() }
        setDeletingId(null)
    }

    const activePlans = plans.filter((p) => p.is_active)
    const inactivePlans = plans.filter((p) => !p.is_active)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Plans</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {plans.length} plan{plans.length !== 1 ? 's' : ''} · {activePlans.length} active
                    </p>
                </div>
                <Button
                    onClick={() => { setEditingPlan(null); setShowModal(true) }}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5 px-4 shrink-0"
                >
                    <Plus className="h-4 w-4" /> New Plan
                </Button>
            </div>

            {/* Empty state */}
            {plans.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 rounded-xl bg-white border border-dashed border-gray-200 text-center">
                    <CreditCard className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-500">No plans yet</p>
                    <p className="text-xs text-gray-400 mt-1">Create your first membership plan to get started</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                        Create a Plan
                    </button>
                </div>
            )}

            {/* Active plans */}
            {activePlans.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {activePlans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                togglingId={togglingId}
                                deletingId={deletingId}
                                onEdit={() => { setEditingPlan(plan); setShowModal(true) }}
                                onToggle={() => handleToggle(plan)}
                                onDelete={() => handleDelete(plan.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Inactive plans */}
            {inactivePlans.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Inactive</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {inactivePlans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                togglingId={togglingId}
                                deletingId={deletingId}
                                onEdit={() => { setEditingPlan(plan); setShowModal(true) }}
                                onToggle={() => handleToggle(plan)}
                                onDelete={() => handleDelete(plan.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <PlanModal
                    plan={editingPlan}
                    onClose={() => { setShowModal(false); setEditingPlan(null) }}
                />
            )}
        </div>
    )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
    plan, togglingId, deletingId, onEdit, onToggle, onDelete,
}: {
    plan: Plan
    togglingId: string | null
    deletingId: string | null
    onEdit: () => void
    onToggle: () => void
    onDelete: () => void
}) {
    return (
        <div className={`rounded-xl bg-white border shadow-sm p-5 transition-all ${plan.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
            {/* Card header */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{plan.name}</h3>
                    {plan.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{plan.description}</p>
                    )}
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${plan.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>

            {/* Price + Duration */}
            <div className="flex items-end justify-between mb-4">
                <div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(plan.price))}</p>
                    <p className="text-xs text-gray-400">{plan.duration_days} days</p>
                </div>
                <p className="text-xs text-gray-400">
                    {formatCurrency(Number(plan.price) / plan.duration_days * 30)}
                    <span className="text-[10px]">/mo equiv.</span>
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                <button
                    onClick={onEdit}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <Pencil className="h-3 w-3" /> Edit
                </button>

                <button
                    onClick={onToggle}
                    disabled={togglingId === plan.id}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${plan.is_active ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                    {togglingId === plan.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : plan.is_active
                            ? <ToggleRight className="h-3.5 w-3.5" />
                            : <ToggleLeft className="h-3.5 w-3.5" />
                    }
                    {plan.is_active ? 'Deactivate' : 'Activate'}
                </button>

                <button
                    onClick={onDelete}
                    disabled={deletingId === plan.id}
                    title="Delete plan"
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                    {deletingId === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    )
}

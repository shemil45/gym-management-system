'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Ban, CreditCard, Loader2, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { updateMembershipFeeSettings } from '@/app/admin/settings/membership-fees/actions'

interface MembershipFeesSettingsProps {
    gym: {
        default_admission_fee: number
        allow_admission_fee_waiver: boolean
        allow_custom_membership_start_date: boolean
    }
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
    disabled,
}: {
    label: string
    description: string
    checked: boolean
    onChange: (next: boolean) => void
    disabled?: boolean
}) {
    const { isDark } = useAdminTheme()
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                <p className={`mt-0.5 text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{description}</p>
            </div>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    checked
                        ? isDark
                            ? 'border-[#10b981]/30 bg-[#10b981]/10 text-[#8df0c9] hover:bg-[#10b981]/20'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : isDark
                            ? 'border-[#2a2a2a] bg-[#161616] text-zinc-400 hover:bg-[#222222]'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
            >
                {checked ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                {checked ? 'On' : 'Off'}
            </button>
        </div>
    )
}

export default function MembershipFeesSettings({ gym }: MembershipFeesSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [fee, setFee] = useState(String(gym.default_admission_fee))
    const [allowWaiver, setAllowWaiver] = useState(gym.allow_admission_fee_waiver)
    const [allowCustomStartDate, setAllowCustomStartDate] = useState(gym.allow_custom_membership_start_date)
    const [feeTouched, setFeeTouched] = useState(false)

    const feeNumber = Number(fee)
    const feeError = feeTouched && (fee.trim() === '' || !Number.isFinite(feeNumber) || feeNumber < 0)
        ? 'Enter a valid amount of 0 or more'
        : null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setFeeTouched(true)
        if (fee.trim() === '' || !Number.isFinite(feeNumber) || feeNumber < 0) return

        const fd = new FormData()
        fd.append('default_admission_fee', fee)
        fd.append('allow_admission_fee_waiver', String(allowWaiver))
        fd.append('allow_custom_membership_start_date', String(allowCustomStartDate))

        startTransition(async () => {
            const result = await updateMembershipFeeSettings(fd)
            if ('error' in result) toast.error(result.error)
            else { toast.success('Membership & fee settings saved'); router.refresh() }
        })
    }

    const cardClass = `rounded-xl p-6 ${
        isDark
            ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
            : 'border border-gray-200 bg-white shadow-sm'
    }`

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
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Membership & Fees</h1>
                <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Admission fees and default membership terms.
                </p>
            </div>

            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Tag className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fees</h2>
                </div>

                <div className="max-w-xs space-y-1.5">
                    <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                        Default Admission Fee
                    </Label>
                    <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>₹</span>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fee}
                            onChange={(e) => { setFee(e.target.value); setFeeTouched(true) }}
                            disabled={pending}
                            className={`h-10 pl-7 text-sm ${
                                feeError
                                    ? 'border-red-400 focus:ring-red-400'
                                    : isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    {feeError ? (
                        <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span> {feeError}</p>
                    ) : (
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                            One-time fee charged when a member joins. Not applied to renewals.
                        </p>
                    )}
                </div>
            </div>

            <div className={cardClass}>
                <div className="mb-1 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <CreditCard className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Membership Defaults</h2>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    New memberships start on the payment/registration date by default.
                </p>
                <div className={`mt-2 divide-y ${isDark ? 'divide-[#2a2a2a]' : 'divide-gray-100'}`}>
                    <ToggleRow
                        label="Allow staff to pick a different start date"
                        description="When on, staff can override the membership start date during Add Member."
                        checked={allowCustomStartDate}
                        onChange={setAllowCustomStartDate}
                        disabled={pending}
                    />
                </div>
            </div>

            <div className={cardClass}>
                <div className="mb-1 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
                        <Ban className={`h-4 w-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fee Options</h2>
                </div>
                <div className={`mt-2 divide-y ${isDark ? 'divide-[#2a2a2a]' : 'divide-gray-100'}`}>
                    <ToggleRow
                        label="Allow staff to waive admission fee"
                        description="When off, staff must use the configured default with no edit or waive option."
                        checked={allowWaiver}
                        onChange={setAllowWaiver}
                        disabled={pending}
                    />
                </div>
            </div>

            <div>
                <Button
                    type="submit"
                    disabled={pending}
                    className={`h-10 px-6 font-semibold shadow-sm ${
                        isDark ? 'bg-[#10b981] hover:bg-[#0ea271] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </form>
    )
}

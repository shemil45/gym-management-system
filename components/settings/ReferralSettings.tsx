'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Coins, Gift, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { updateReferralSettings } from '@/app/admin/settings/referrals/actions'

const MAX_BONUS = 100000

interface ReferralSettingsProps {
    gym: {
        referrals_enabled: boolean
        referral_bonus_coins: number
    }
    /** Whether the plan/platform make referrals available at all. */
    available: boolean
    onboardingComplete: boolean
}

/**
 * Tenant-side referral controls. The switch only narrows what the plan
 * grants: when referrals are not part of the plan the page says so and the
 * controls are read-only.
 */
export default function ReferralSettings({ gym, available, onboardingComplete }: ReferralSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [enabled, setEnabled] = useState(gym.referrals_enabled)
    const [bonus, setBonus] = useState(String(gym.referral_bonus_coins))
    const [touched, setTouched] = useState(false)

    const bonusValue = Number(bonus)
    const bonusInvalid = bonus.trim() === '' || !Number.isInteger(bonusValue) || bonusValue < 0 || bonusValue > MAX_BONUS
    const bonusError = touched && bonusInvalid ? `Enter a whole number between 0 and ${MAX_BONUS.toLocaleString('en-IN')}` : null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setTouched(true)
        if (bonusInvalid) return

        const fd = new FormData()
        fd.append('referrals_enabled', String(enabled))
        fd.append('referral_bonus_coins', bonus.trim())

        startTransition(async () => {
            const result = await updateReferralSettings(fd)
            if ('error' in result) toast.error(result.error)
            else { toast.success('Referral settings saved'); router.refresh() }
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
    const locked = !available

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
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Referrals</h1>
                <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Let members invite friends with a share link, and decide what a successful referral earns them.
                </p>
            </div>

            {locked ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${
                    isDark ? 'border-amber-900/40 bg-amber-950/30 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}>
                    {onboardingComplete
                        ? 'Referrals are not included in your current plan. Upgrade your subscription to turn the programme on.'
                        : 'Referrals become available once gym setup is complete.'}
                </div>
            ) : null}

            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Gift className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Referral Programme</h2>
                </div>

                <div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
                    isDark ? 'border-[#2a2a2a] bg-[#161616]' : 'border-gray-200 bg-gray-50'
                }`}>
                    <div className="min-w-0">
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Enable referrals</p>
                        <p className={`mt-0.5 text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                            Shows the Refer a Friend page to members, accepts referral leads, and unlocks the Referrals report. Turning it off hides all of that; existing referrals are kept.
                        </p>
                    </div>
                    <Switch checked={enabled && !locked} onCheckedChange={setEnabled} disabled={pending || locked} aria-label="Enable referrals" />
                </div>
            </div>

            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Coins className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Reward</h2>
                </div>

                <div className="space-y-1.5">
                    <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                        Coins per referral
                    </Label>
                    <Input
                        type="number"
                        min="0"
                        max={MAX_BONUS}
                        step="1"
                        inputMode="numeric"
                        value={bonus}
                        onChange={(e) => { setBonus(e.target.value); setTouched(true) }}
                        disabled={pending || locked}
                        className={`max-w-[10rem] ${inputClass(!!bonusError)}`}
                    />
                    {bonusError ? (
                        <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span> {bonusError}</p>
                    ) : (
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                            Credited to the referring member when their friend&apos;s registration is completed. Members spend coins against renewals. Applies to referrals converted from now on; past credits are unchanged.
                        </p>
                    )}
                </div>
            </div>

            <div>
                <Button
                    type="submit"
                    disabled={pending || locked}
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

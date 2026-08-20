'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Hash, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { updateMemberIdSettings } from '@/app/admin/settings/member-settings/actions'

interface MemberIdSettingsProps {
    gym: {
        member_id_prefix: string
        member_id_next_number: number
        member_id_padding: number
    }
}

export default function MemberIdSettings({ gym }: MemberIdSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [prefix, setPrefix] = useState(gym.member_id_prefix)
    const [nextNumber, setNextNumber] = useState(String(gym.member_id_next_number))
    const [padding, setPadding] = useState(String(gym.member_id_padding))
    const [touched, setTouched] = useState(false)

    const nextNumberValue = Number(nextNumber)
    const paddingValue = Number(padding)

    const prefixError = touched && (prefix.trim() === '' || prefix.trim().length > 10)
        ? 'Enter 1-10 characters'
        : null
    const nextNumberError = touched && (nextNumber.trim() === '' || !Number.isInteger(nextNumberValue) || nextNumberValue < 1)
        ? 'Enter a whole number of 1 or more'
        : null
    const paddingError = touched && (padding.trim() === '' || !Number.isInteger(paddingValue) || paddingValue < 1 || paddingValue > 10)
        ? 'Enter a whole number between 1 and 10'
        : null

    const previewValid = prefix.trim() !== '' && Number.isInteger(nextNumberValue) && nextNumberValue >= 1
        && Number.isInteger(paddingValue) && paddingValue >= 1 && paddingValue <= 10
    const preview = previewValid
        ? `${prefix.trim()}${String(nextNumberValue).padStart(paddingValue, '0')}`
        : '—'

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setTouched(true)
        if (prefixError !== null || nextNumberError !== null || paddingError !== null || !previewValid) return
        if (prefix.trim() === '' || prefix.trim().length > 10) return
        if (!Number.isInteger(nextNumberValue) || nextNumberValue < 1) return
        if (!Number.isInteger(paddingValue) || paddingValue < 1 || paddingValue > 10) return

        const fd = new FormData()
        fd.append('member_id_prefix', prefix.trim())
        fd.append('member_id_next_number', nextNumber)
        fd.append('member_id_padding', padding)

        startTransition(async () => {
            const result = await updateMemberIdSettings(fd)
            if ('error' in result) toast.error(result.error)
            else { toast.success('Member ID settings saved'); router.refresh() }
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
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Member Settings</h1>
                <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Control how new member IDs are generated. New members always receive the next ID automatically.
                </p>
            </div>

            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Hash className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Member ID Format</h2>
                </div>

                <div className="grid max-w-md gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                            ID Prefix
                        </Label>
                        <Input
                            type="text"
                            value={prefix}
                            onChange={(e) => { setPrefix(e.target.value); setTouched(true) }}
                            disabled={pending}
                            maxLength={10}
                            className={inputClass(!!prefixError)}
                        />
                        {prefixError && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span> {prefixError}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                            Number Padding
                        </Label>
                        <Input
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            value={padding}
                            onChange={(e) => { setPadding(e.target.value); setTouched(true) }}
                            disabled={pending}
                            className={inputClass(!!paddingError)}
                        />
                        {paddingError && <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span> {paddingError}</p>}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                            Next Number
                        </Label>
                        <Input
                            type="number"
                            min="1"
                            step="1"
                            value={nextNumber}
                            onChange={(e) => { setNextNumber(e.target.value); setTouched(true) }}
                            disabled={pending}
                            className={`max-w-[10rem] ${inputClass(!!nextNumberError)}`}
                        />
                        {nextNumberError ? (
                            <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span> {nextNumberError}</p>
                        ) : (
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                                The ID assigned to the next new member. Increments automatically as members are added.
                            </p>
                        )}
                    </div>
                </div>

                <div className={`mt-5 flex items-center gap-3 rounded-lg border px-4 py-3 ${
                    isDark ? 'border-[#2a2a2a] bg-[#161616]' : 'border-gray-200 bg-gray-50'
                }`}>
                    <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        Next ID Preview
                    </span>
                    <span className={`font-mono text-lg font-semibold ${isDark ? 'text-[#8df0c9]' : 'text-emerald-700'}`}>
                        {preview}
                    </span>
                </div>

                <p className={`mt-4 text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                    New members always receive an auto-generated ID — manual entry isn&apos;t supported. Existing member IDs are never changed by these settings, and changes here only affect members added from now on.
                </p>
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

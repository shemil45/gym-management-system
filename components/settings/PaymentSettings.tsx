'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Wallet, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import SettingsPageContainer from '@/components/settings/SettingsPageContainer'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { updatePaymentSettings } from '@/app/admin/settings/payment-settings/actions'

const PAYMENT_METHODS = [
    { key: 'cash', label: 'Cash', description: 'Accept in-person cash payments at the front desk.' },
    { key: 'upi', label: 'UPI', description: 'Accept UPI payments via apps like Google Pay or PhonePe.' },
    { key: 'card', label: 'Card', description: 'Accept debit or credit card payments.' },
    { key: 'bank_transfer', label: 'Bank Transfer', description: 'Accept direct bank transfers (NEFT/IMPS/RTGS).' },
] as const

type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]['key']

interface PaymentSettingsProps {
    gym: {
        payment_method_cash_enabled: boolean
        payment_method_upi_enabled: boolean
        payment_method_card_enabled: boolean
        payment_method_bank_transfer_enabled: boolean
        default_payment_method: string
    }
}

export default function PaymentSettings({ gym }: PaymentSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [enabled, setEnabled] = useState<Record<PaymentMethodKey, boolean>>({
        cash: gym.payment_method_cash_enabled,
        upi: gym.payment_method_upi_enabled,
        card: gym.payment_method_card_enabled,
        bank_transfer: gym.payment_method_bank_transfer_enabled,
    })
    const [defaultMethod, setDefaultMethod] = useState<string>(gym.default_payment_method)

    const enabledMethods = PAYMENT_METHODS.filter((m) => enabled[m.key])

    const handleToggle = (key: PaymentMethodKey, value: boolean) => {
        setEnabled((prev) => ({ ...prev, [key]: value }))
        if (!value && defaultMethod === key) {
            setDefaultMethod('')
        }
    }

    const handleSave = () => {
        if (!PAYMENT_METHODS.some((m) => enabled[m.key])) {
            toast.error('At least one payment method must be enabled.')
            return
        }
        if (!defaultMethod || !enabled[defaultMethod as PaymentMethodKey]) {
            toast.error('Please select a default payment method from the enabled methods.')
            return
        }

        const formData = new FormData()
        formData.set('payment_method_cash_enabled', String(enabled.cash))
        formData.set('payment_method_upi_enabled', String(enabled.upi))
        formData.set('payment_method_card_enabled', String(enabled.card))
        formData.set('payment_method_bank_transfer_enabled', String(enabled.bank_transfer))
        formData.set('default_payment_method', defaultMethod)

        startTransition(async () => {
            const result = await updatePaymentSettings(formData)
            if ('error' in result) {
                toast.error(result.error)
                return
            }
            toast.success('Payment settings saved')
            router.refresh()
        })
    }

    return (
        <SettingsPageContainer>
            <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4" /> Back to settings
            </Link>

            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? 'bg-[#10b981]/15' : 'bg-slate-950'}`}>
                    <Wallet className={`h-5 w-5 ${isDark ? 'text-[#10b981]' : 'text-white'}`} />
                </div>
                <div>
                    <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>Payment Settings</h1>
                    <p className="text-sm text-slate-500">Accepted payment methods and defaults.</p>
                </div>
            </div>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">Payment Methods</h2>
                    <p className="text-xs text-slate-500">
                        Choose which payment methods your staff can select when recording a payment.
                    </p>
                </div>
                <div className="space-y-3">
                    {PAYMENT_METHODS.map(({ key, label, description }) => (
                        <div key={key} className="flex items-center justify-between gap-4">
                            <div>
                                <Label className="text-sm font-normal text-slate-700">{label}</Label>
                                <p className="text-xs text-slate-400">{description}</p>
                            </div>
                            <Switch checked={enabled[key]} onCheckedChange={(value) => handleToggle(key, value)} />
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">Default Payment Method</h2>
                    <p className="text-xs text-slate-500">
                        This method will be preselected when your staff opens Record Payment.
                    </p>
                </div>

                {!defaultMethod && (
                    <div
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                            isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50'
                        }`}
                    >
                        <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                        <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                            Your previous default method is disabled. Select another enabled method before saving.
                        </p>
                    </div>
                )}

                <Select value={defaultMethod} onValueChange={setDefaultMethod}>
                    <SelectTrigger className="h-10 border-slate-300 text-sm text-slate-700">
                        <SelectValue placeholder="Select a default method" />
                    </SelectTrigger>
                    <SelectContent>
                        {enabledMethods.map(({ key, label }) => (
                            <SelectItem key={key} value={key}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </section>

            <Button
                onClick={handleSave}
                disabled={pending}
                className={`w-full sm:w-auto ${isDark ? 'bg-[#10b981] hover:bg-[#0ea271] text-white' : ''}`}
            >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {pending ? 'Saving...' : 'Save Changes'}
            </Button>
        </SettingsPageContainer>
    )
}

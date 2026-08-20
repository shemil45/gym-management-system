'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import SettingsPageContainer from '@/components/settings/SettingsPageContainer'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { updateReceiptSettings } from '@/app/admin/settings/invoice-receipt/actions'

interface InvoiceReceiptSettingsProps {
    gym: {
        receipt_prefix: string
        receipt_next_number: number
        receipt_show_logo: boolean
        receipt_show_address: boolean
        receipt_show_phone: boolean
        receipt_show_email: boolean
        receipt_show_gstin: boolean
        receipt_footer_message: string | null
        receipt_additional_notes: string | null
        logo_url: string | null
    }
}

export default function InvoiceReceiptSettings({ gym }: InvoiceReceiptSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [prefix, setPrefix] = useState(gym.receipt_prefix)
    const [nextNumber, setNextNumber] = useState(String(gym.receipt_next_number))
    const [showLogo, setShowLogo] = useState(gym.receipt_show_logo)
    const [showAddress, setShowAddress] = useState(gym.receipt_show_address)
    const [showPhone, setShowPhone] = useState(gym.receipt_show_phone)
    const [showEmail, setShowEmail] = useState(gym.receipt_show_email)
    const [showGstin, setShowGstin] = useState(gym.receipt_show_gstin)
    const [footerMessage, setFooterMessage] = useState(gym.receipt_footer_message ?? '')
    const [additionalNotes, setAdditionalNotes] = useState(gym.receipt_additional_notes ?? '')

    const parsedNextNumber = parseInt(nextNumber, 10)
    const previewNumber = `${prefix || 'REC-'}${String(Number.isFinite(parsedNextNumber) && parsedNextNumber > 0 ? parsedNextNumber : 1).padStart(6, '0')}`

    const handleSave = () => {
        const formData = new FormData()
        formData.set('receipt_prefix', prefix)
        formData.set('receipt_next_number', nextNumber)
        formData.set('receipt_show_logo', String(showLogo))
        formData.set('receipt_show_address', String(showAddress))
        formData.set('receipt_show_phone', String(showPhone))
        formData.set('receipt_show_email', String(showEmail))
        formData.set('receipt_show_gstin', String(showGstin))
        formData.set('receipt_footer_message', footerMessage)
        formData.set('receipt_additional_notes', additionalNotes)

        startTransition(async () => {
            const result = await updateReceiptSettings(formData)
            if ('error' in result) {
                toast.error(result.error)
                return
            }
            toast.success('Receipt settings saved')
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
                    <Receipt className={`h-5 w-5 ${isDark ? 'text-[#10b981]' : 'text-white'}`} />
                </div>
                <div>
                    <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>Invoice &amp; Receipt</h1>
                    <p className="text-sm text-slate-500">Receipt numbering, branding, and content.</p>
                </div>
            </div>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Receipt numbering</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="receipt_prefix">Receipt prefix</Label>
                        <Input id="receipt_prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={20} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="receipt_next_number">Next receipt number</Label>
                        <Input
                            id="receipt_next_number"
                            type="number"
                            min={1}
                            value={nextNumber}
                            onChange={(e) => setNextNumber(e.target.value)}
                        />
                    </div>
                </div>
                <div className={`rounded-lg border border-dashed bg-slate-50 px-4 py-3 ${isDark ? 'border-[#2a2a2a]' : 'border-slate-300'}`}>
                    <p className="text-xs text-slate-500">Next generated receipt number will look like</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{previewNumber}</p>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Receipt branding</h2>
                <p className="text-xs text-slate-500">
                    Gym logo is managed on the{' '}
                    <Link href="/admin/settings/gym-profile" className="font-medium text-slate-700 underline underline-offset-2">
                        Gym Profile
                    </Link>{' '}
                    page{gym.logo_url ? '.' : ' — no logo uploaded yet.'}
                </p>
                <div className="space-y-3">
                    {([
                        ['Show gym logo', showLogo, setShowLogo],
                        ['Show gym address', showAddress, setShowAddress],
                        ['Show gym phone', showPhone, setShowPhone],
                        ['Show gym email', showEmail, setShowEmail],
                        ['Show GSTIN', showGstin, setShowGstin],
                    ] as const).map(([label, value, setter]) => (
                        <div key={label} className="flex items-center justify-between">
                            <Label className="text-sm font-normal text-slate-700">{label}</Label>
                            <Switch checked={value} onCheckedChange={setter} />
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Receipt content</h2>
                <div className="space-y-1.5">
                    <Label htmlFor="receipt_footer_message">Receipt footer message</Label>
                    <Input
                        id="receipt_footer_message"
                        value={footerMessage}
                        onChange={(e) => setFooterMessage(e.target.value)}
                        placeholder="Thank you for training with us!"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="receipt_additional_notes">Additional notes</Label>
                    <textarea
                        id="receipt_additional_notes"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        placeholder="This is a system generated receipt and does not require a physical signature."
                    />
                </div>
            </section>

            <Button
                onClick={handleSave}
                disabled={pending}
                className={`w-full sm:w-auto ${isDark ? 'bg-[#10b981] hover:bg-[#0ea271] text-white' : ''}`}
            >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {pending ? 'Saving...' : 'Save receipt settings'}
            </Button>
        </SettingsPageContainer>
    )
}

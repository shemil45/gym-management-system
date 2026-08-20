'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateNotificationSettings } from '@/app/admin/settings/notifications/actions'

interface NotificationSettingsProps {
    gym: {
        notify_expiry_reminder_enabled: boolean
        notify_expiry_reminder_days: number
        notify_expired_notice_enabled: boolean
        notify_expired_notice_days: number
        notify_payment_confirmation_enabled: boolean
        notify_renewal_confirmation_enabled: boolean
        notify_welcome_message_enabled: boolean
    }
}

export default function NotificationSettings({ gym }: NotificationSettingsProps) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [expiryReminderEnabled, setExpiryReminderEnabled] = useState(gym.notify_expiry_reminder_enabled)
    const [expiryReminderDays, setExpiryReminderDays] = useState(String(gym.notify_expiry_reminder_days))
    const [expiredNoticeEnabled, setExpiredNoticeEnabled] = useState(gym.notify_expired_notice_enabled)
    const [expiredNoticeDays, setExpiredNoticeDays] = useState(String(gym.notify_expired_notice_days))
    const [paymentConfirmationEnabled, setPaymentConfirmationEnabled] = useState(gym.notify_payment_confirmation_enabled)
    const [renewalConfirmationEnabled, setRenewalConfirmationEnabled] = useState(gym.notify_renewal_confirmation_enabled)
    const [welcomeMessageEnabled, setWelcomeMessageEnabled] = useState(gym.notify_welcome_message_enabled)

    const handleSave = () => {
        const formData = new FormData()
        formData.set('notify_expiry_reminder_enabled', String(expiryReminderEnabled))
        formData.set('notify_expiry_reminder_days', expiryReminderDays)
        formData.set('notify_expired_notice_enabled', String(expiredNoticeEnabled))
        formData.set('notify_expired_notice_days', expiredNoticeDays)
        formData.set('notify_payment_confirmation_enabled', String(paymentConfirmationEnabled))
        formData.set('notify_renewal_confirmation_enabled', String(renewalConfirmationEnabled))
        formData.set('notify_welcome_message_enabled', String(welcomeMessageEnabled))

        startTransition(async () => {
            const result = await updateNotificationSettings(formData)
            if ('error' in result) {
                toast.error(result.error)
                return
            }
            toast.success('Notification settings saved')
            router.refresh()
        })
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4" /> Back to settings
            </Link>

            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <Bell className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-950">Notifications</h1>
                    <p className="text-sm text-slate-500">Control which WhatsApp messages are sent to members.</p>
                </div>
            </div>

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Membership</h2>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-normal text-slate-700">Membership expiry reminder</Label>
                            <p className="text-xs text-slate-500">Send a WhatsApp reminder as a member&apos;s plan approaches its expiry date.</p>
                        </div>
                        <Switch checked={expiryReminderEnabled} onCheckedChange={setExpiryReminderEnabled} />
                    </div>
                    <div className={`max-w-[220px] space-y-1.5 ${expiryReminderEnabled ? '' : 'opacity-50'}`}>
                        <Label htmlFor="notify_expiry_reminder_days">Days before expiry</Label>
                        <Input
                            id="notify_expiry_reminder_days"
                            type="number"
                            min={1}
                            max={90}
                            value={expiryReminderDays}
                            onChange={(e) => setExpiryReminderDays(e.target.value)}
                            disabled={!expiryReminderEnabled}
                        />
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-normal text-slate-700">Expired membership notice</Label>
                                <p className="text-xs text-slate-500">Send a WhatsApp notice once a member&apos;s plan has expired.</p>
                            </div>
                            <Switch checked={expiredNoticeEnabled} onCheckedChange={setExpiredNoticeEnabled} />
                        </div>
                        <div className={`max-w-[220px] space-y-1.5 ${expiredNoticeEnabled ? '' : 'opacity-50'}`}>
                            <Label htmlFor="notify_expired_notice_days">Days after expiry</Label>
                            <Input
                                id="notify_expired_notice_days"
                                type="number"
                                min={0}
                                max={90}
                                value={expiredNoticeDays}
                                onChange={(e) => setExpiredNoticeDays(e.target.value)}
                                disabled={!expiredNoticeEnabled}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Payments</h2>

                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-sm font-normal text-slate-700">Payment confirmation</Label>
                        <p className="text-xs text-slate-500">Send a WhatsApp receipt when a payment is recorded.</p>
                    </div>
                    <Switch checked={paymentConfirmationEnabled} onCheckedChange={setPaymentConfirmationEnabled} />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-sm font-normal text-slate-700">Renewal confirmation</Label>
                        <p className="text-xs text-slate-500">Send a WhatsApp confirmation when a membership is renewed.</p>
                    </div>
                    <Switch checked={renewalConfirmationEnabled} onCheckedChange={setRenewalConfirmationEnabled} />
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Members</h2>

                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-sm font-normal text-slate-700">New member welcome message</Label>
                        <p className="text-xs text-slate-500">Send a WhatsApp welcome message when a new member is added.</p>
                    </div>
                    <Switch checked={welcomeMessageEnabled} onCheckedChange={setWelcomeMessageEnabled} />
                </div>
            </section>

            <Button onClick={handleSave} disabled={pending} className="w-full sm:w-auto">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {pending ? 'Saving...' : 'Save changes'}
            </Button>
        </div>
    )
}

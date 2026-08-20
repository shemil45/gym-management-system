import { redirect } from 'next/navigation'
import NotificationSettings from '@/components/settings/NotificationSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type NotificationSettingsFields = Pick<Tables<'gyms'>,
    'notify_expiry_reminder_enabled' | 'notify_expiry_reminder_days' | 'notify_expired_notice_enabled' |
    'notify_expired_notice_days' | 'notify_payment_confirmation_enabled' | 'notify_renewal_confirmation_enabled' |
    'notify_welcome_message_enabled'>

export default async function NotificationsSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member/dashboard')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('notify_expiry_reminder_enabled, notify_expiry_reminder_days, notify_expired_notice_enabled, notify_expired_notice_days, notify_payment_confirmation_enabled, notify_renewal_confirmation_enabled, notify_welcome_message_enabled')
        .eq('id', gym.id)
        .single()
    const { data: notificationSettings } = gymResult as unknown as QueryResult<NotificationSettingsFields | null>

    return (
        <NotificationSettings
            gym={{
                notify_expiry_reminder_enabled: notificationSettings?.notify_expiry_reminder_enabled ?? true,
                notify_expiry_reminder_days: notificationSettings?.notify_expiry_reminder_days ?? 7,
                notify_expired_notice_enabled: notificationSettings?.notify_expired_notice_enabled ?? true,
                notify_expired_notice_days: notificationSettings?.notify_expired_notice_days ?? 0,
                notify_payment_confirmation_enabled: notificationSettings?.notify_payment_confirmation_enabled ?? true,
                notify_renewal_confirmation_enabled: notificationSettings?.notify_renewal_confirmation_enabled ?? true,
                notify_welcome_message_enabled: notificationSettings?.notify_welcome_message_enabled ?? true,
            }}
        />
    )
}

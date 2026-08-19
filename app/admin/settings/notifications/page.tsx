'use client'

import { Bell } from 'lucide-react'
import SettingsPlaceholderPage from '@/components/settings/SettingsPlaceholderPage'

export default function NotificationsSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Notifications"
            description="Reminders and alerts sent to members and staff."
            icon={<Bell className="h-5 w-5" />}
        />
    )
}

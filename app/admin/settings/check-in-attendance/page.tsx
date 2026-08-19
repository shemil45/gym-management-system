'use client'

import { UserCheck } from 'lucide-react'
import SettingsPlaceholderPage from '@/components/settings/SettingsPlaceholderPage'

export default function CheckInAttendanceSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Check-in & Attendance"
            description="Check-in rules and attendance tracking preferences."
            icon={<UserCheck className="h-5 w-5" />}
        />
    )
}

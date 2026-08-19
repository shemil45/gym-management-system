'use client'

import { Tag } from 'lucide-react'
import SettingsPlaceholderPage from '@/components/settings/SettingsPlaceholderPage'

export default function MembershipFeesSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Membership & Fees"
            description="Admission fees and default membership terms."
            icon={<Tag className="h-5 w-5" />}
        />
    )
}

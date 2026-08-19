'use client'

import { Users } from 'lucide-react'
import SettingsPlaceholderPage from '@/components/settings/SettingsPlaceholderPage'

export default function MemberSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Member Settings"
            description="Member ID format and default onboarding preferences."
            icon={<Users className="h-5 w-5" />}
        />
    )
}

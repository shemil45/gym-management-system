'use client'

import { Building2 } from 'lucide-react'
import SettingsPlaceholderPage from '@/components/settings/SettingsPlaceholderPage'

export default function GymProfileSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Gym Profile"
            description="Name, logo, address, and contact details for your gym."
            icon={<Building2 className="h-5 w-5" />}
        />
    )
}

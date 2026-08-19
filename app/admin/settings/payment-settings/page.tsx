'use client'

import { Wallet } from 'lucide-react'
import SettingsPlaceholderPage from '@/components/settings/SettingsPlaceholderPage'

export default function PaymentSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Payment Settings"
            description="Accepted payment methods and provider configuration."
            icon={<Wallet className="h-5 w-5" />}
        />
    )
}

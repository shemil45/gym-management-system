'use client'

import { Receipt } from 'lucide-react'
import SettingsPlaceholderPage from '@/components/settings/SettingsPlaceholderPage'

export default function InvoiceReceiptSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Invoice & Receipt"
            description="Invoice numbering, branding, and receipt templates."
            icon={<Receipt className="h-5 w-5" />}
        />
    )
}

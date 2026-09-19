'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

export default function CopyPhoneButton({ phone, name }: { phone: string; name: string }) {
    const [copied, setCopied] = useState(false)
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(phone)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            toast.error('Failed to copy phone number')
        }
    }
    return (
        <button type="button" onClick={copy} aria-label={`Copy phone number for ${name}`} title="Copy phone number"
            className="inline-flex items-center gap-1 rounded text-xs text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:text-neutral-300 dark:hover:text-white">
            <span className="tabular-nums">{phone}</span>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    )
}

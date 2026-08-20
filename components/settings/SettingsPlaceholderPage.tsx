'use client'

import { ArrowLeft, Construction } from 'lucide-react'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import SettingsPageContainer from '@/components/settings/SettingsPageContainer'

interface SettingsPlaceholderPageProps {
    title: string
    description: string
    icon: React.ReactNode
}

export default function SettingsPlaceholderPage({ title, description, icon }: SettingsPlaceholderPageProps) {
    const { isDark } = useAdminTheme()

    return (
        <SettingsPageContainer className="space-y-5">
            <LoadingLinkButton
                href="/admin/settings"
                loadingText="Going back..."
                variant="ghost"
                className={`flex h-9 items-center gap-1.5 rounded-xl px-2 ${
                    isDark ? 'text-zinc-300 hover:bg-[#242424] hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Settings</span>
            </LoadingLinkButton>

            <div className="flex items-start gap-3">
                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isDark ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-blue-100 text-blue-600'
                    }`}
                >
                    {icon}
                </div>
                <div className="min-w-0">
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
                    <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{description}</p>
                </div>
            </div>

            <div
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl px-4 py-16 text-center sm:py-20 ${
                    isDark
                        ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
                        : 'border border-[#e7e9ee] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)]'
                }`}
            >
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                        isDark ? 'bg-[#242424] text-zinc-500' : 'bg-slate-100 text-slate-400'
                    }`}
                >
                    <Construction className="h-5 w-5" />
                </div>
                <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
                        Configuration options coming soon
                    </p>
                    <p className={`mt-1 max-w-sm text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        This section is reserved for future {title.toLowerCase()} settings. Nothing to configure here yet.
                    </p>
                </div>
            </div>
        </SettingsPageContainer>
    )
}

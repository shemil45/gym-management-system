// Shared skeleton building blocks for the Settings section's route-level
// loading.tsx files. Plain bg-slate-200 blocks are used (not isDark-aware)
// because the .admin-theme-dark global CSS override in app/globals.css
// already remaps bg-slate-200 -> #222222 for dark mode, matching the
// convention used by every other loading.tsx in this app.

export function SettingsSkeletonShell({ children }: { children: React.ReactNode }) {
    return <div className="animate-pulse space-y-6">{children}</div>
}

export function SkeletonBar({ className }: { className: string }) {
    return <div className={`rounded-md bg-slate-200 ${className}`} />
}

export function SkeletonCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
            {children}
        </div>
    )
}

export function SkeletonFieldRow({ labelWidth = 'w-24', className = '' }: { labelWidth?: string; className?: string }) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <SkeletonBar className={`h-3 ${labelWidth}`} />
            <SkeletonBar className="h-10 w-full" />
        </div>
    )
}

export function SkeletonToggleRow() {
    return (
        <div className="flex items-center justify-between gap-4 py-1">
            <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonBar className="h-3.5 w-40" />
                <SkeletonBar className="h-3 w-56" />
            </div>
            <SkeletonBar className="h-6 w-11 shrink-0 rounded-full" />
        </div>
    )
}

// Back-link + icon chip + title, matching InvoiceReceiptSettings /
// NotificationSettings / PaymentSettings's header shape.
export function SettingsIconHeaderSkeleton({ titleWidth = 'w-40' }: { titleWidth?: string }) {
    return (
        <>
            <SkeletonBar className="h-5 w-28" />
            <div className="flex items-center gap-3">
                <SkeletonBar className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                    <SkeletonBar className={`h-5 ${titleWidth}`} />
                    <SkeletonBar className="h-4 w-56" />
                </div>
            </div>
        </>
    )
}

// Back-button + large title, matching GymProfileSettings / MembershipFeesSettings
// / MemberIdSettings / AccountSettings / SettingsHub's header shape.
export function SettingsPlainHeaderSkeleton({ titleWidth = 'w-48' }: { titleWidth?: string }) {
    return (
        <div className="space-y-3">
            <SkeletonBar className="h-9 w-24 rounded-xl" />
            <SkeletonBar className={`h-8 ${titleWidth}`} />
            <SkeletonBar className="h-4 w-72" />
        </div>
    )
}

export function SettingsSaveButtonSkeleton({ className = 'w-40' }: { className?: string }) {
    return <SkeletonBar className={`h-10 ${className} rounded-xl`} />
}

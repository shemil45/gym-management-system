import {
    SettingsSkeletonShell,
    SettingsIconHeaderSkeleton,
    SkeletonCard,
    SkeletonBar,
    SkeletonFieldRow,
    SkeletonToggleRow,
    SettingsSaveButtonSkeleton,
} from '@/components/settings/SettingsSkeleton'

export default function InvoiceReceiptLoading() {
    return (
        <SettingsSkeletonShell>
            <SettingsIconHeaderSkeleton titleWidth="w-40" />

            <SkeletonCard>
                <SkeletonBar className="h-4 w-36" />
                <div className="grid gap-4 sm:grid-cols-2">
                    <SkeletonFieldRow labelWidth="w-28" />
                    <SkeletonFieldRow labelWidth="w-36" />
                </div>
                <SkeletonBar className="h-16 w-full rounded-lg" />
            </SkeletonCard>

            <SkeletonCard>
                <SkeletonBar className="h-4 w-32" />
                <SkeletonBar className="h-3 w-64" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonToggleRow key={i} />
                    ))}
                </div>
            </SkeletonCard>

            <SkeletonCard>
                <SkeletonBar className="h-4 w-32" />
                <SkeletonFieldRow labelWidth="w-36" />
                <div className="space-y-1.5">
                    <SkeletonBar className="h-3 w-28" />
                    <SkeletonBar className="h-20 w-full rounded-lg" />
                </div>
            </SkeletonCard>

            <SettingsSaveButtonSkeleton className="w-44" />
        </SettingsSkeletonShell>
    )
}

import {
    SettingsSkeletonShell,
    SettingsIconHeaderSkeleton,
    SkeletonCard,
    SkeletonBar,
    SkeletonToggleRow,
    SettingsSaveButtonSkeleton,
} from '@/components/settings/SettingsSkeleton'

export default function PaymentSettingsLoading() {
    return (
        <SettingsSkeletonShell>
            <SettingsIconHeaderSkeleton titleWidth="w-44" />

            <SkeletonCard>
                <SkeletonBar className="h-4 w-32" />
                <SkeletonBar className="h-3 w-72" />
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonToggleRow key={i} />
                    ))}
                </div>
            </SkeletonCard>

            <SkeletonCard>
                <SkeletonBar className="h-4 w-44" />
                <SkeletonBar className="h-3 w-64" />
                <SkeletonBar className="h-10 w-full rounded-md" />
            </SkeletonCard>

            <SettingsSaveButtonSkeleton className="w-36" />
        </SettingsSkeletonShell>
    )
}

import {
    SettingsSkeletonShell,
    SettingsIconHeaderSkeleton,
    SkeletonCard,
    SkeletonBar,
    SkeletonToggleRow,
    SettingsSaveButtonSkeleton,
} from '@/components/settings/SettingsSkeleton'

export default function NotificationsLoading() {
    return (
        <SettingsSkeletonShell>
            <SettingsIconHeaderSkeleton titleWidth="w-44" />

            <SkeletonCard>
                <SkeletonBar className="h-4 w-28" />
                <SkeletonToggleRow />
                <div className="max-w-[220px] space-y-1.5">
                    <SkeletonBar className="h-3 w-28" />
                    <SkeletonBar className="h-10 w-full" />
                </div>
                <div className="border-t border-slate-100 pt-4">
                    <SkeletonToggleRow />
                    <div className="max-w-[220px] space-y-1.5">
                        <SkeletonBar className="h-3 w-24" />
                        <SkeletonBar className="h-10 w-full" />
                    </div>
                </div>
            </SkeletonCard>

            <SkeletonCard>
                <SkeletonBar className="h-4 w-24" />
                <SkeletonToggleRow />
                <SkeletonToggleRow />
            </SkeletonCard>

            <SkeletonCard>
                <SkeletonBar className="h-4 w-24" />
                <SkeletonToggleRow />
            </SkeletonCard>

            <SettingsSaveButtonSkeleton className="w-36" />
        </SettingsSkeletonShell>
    )
}

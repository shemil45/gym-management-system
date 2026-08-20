import {
    SettingsSkeletonShell,
    SettingsPlainHeaderSkeleton,
    SkeletonCard,
    SkeletonBar,
    SkeletonFieldRow,
    SettingsSaveButtonSkeleton,
} from '@/components/settings/SettingsSkeleton'

export default function MemberSettingsLoading() {
    return (
        <SettingsSkeletonShell>
            <SettingsPlainHeaderSkeleton titleWidth="w-56" />

            <SkeletonCard className="rounded-xl">
                <div className="mb-4 flex items-center gap-2">
                    <SkeletonBar className="h-8 w-8 rounded-lg" />
                    <SkeletonBar className="h-4 w-40" />
                </div>
                <div className="grid max-w-md gap-4 sm:grid-cols-2">
                    <SkeletonFieldRow labelWidth="w-16" />
                    <SkeletonFieldRow labelWidth="w-28" />
                    <SkeletonFieldRow labelWidth="w-24" className="sm:col-span-2" />
                </div>
            </SkeletonCard>

            <SettingsSaveButtonSkeleton className="w-32" />
        </SettingsSkeletonShell>
    )
}

import {
    SettingsSkeletonShell,
    SettingsPlainHeaderSkeleton,
    SkeletonCard,
    SkeletonBar,
    SkeletonFieldRow,
    SettingsSaveButtonSkeleton,
} from '@/components/settings/SettingsSkeleton'

export default function AccountSettingsLoading() {
    return (
        <SettingsSkeletonShell>
            <SettingsPlainHeaderSkeleton titleWidth="w-40" />

            <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-2">
                <SkeletonCard className="rounded-xl">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <SkeletonBar className="h-8 w-8 rounded-lg" />
                            <SkeletonBar className="h-4 w-24" />
                        </div>
                        <SkeletonBar className="h-8 w-20 rounded-lg" />
                    </div>
                    <SkeletonFieldRow labelWidth="w-32" />
                    <SkeletonFieldRow labelWidth="w-20" />
                    <SkeletonFieldRow labelWidth="w-16" />
                    <SettingsSaveButtonSkeleton className="w-full" />
                </SkeletonCard>

                <SkeletonCard className="rounded-xl">
                    <div className="mb-5 flex items-center gap-2">
                        <SkeletonBar className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1.5">
                            <SkeletonBar className="h-4 w-36" />
                            <SkeletonBar className="h-3 w-28" />
                        </div>
                    </div>
                    <SkeletonFieldRow labelWidth="w-32" />
                    <SkeletonFieldRow labelWidth="w-24" />
                    <SkeletonFieldRow labelWidth="w-32" />
                    <SettingsSaveButtonSkeleton className="w-full" />
                </SkeletonCard>
            </div>
        </SettingsSkeletonShell>
    )
}

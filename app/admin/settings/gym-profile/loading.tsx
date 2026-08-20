import {
    SettingsSkeletonShell,
    SettingsPlainHeaderSkeleton,
    SkeletonCard,
    SkeletonBar,
    SkeletonFieldRow,
    SettingsSaveButtonSkeleton,
} from '@/components/settings/SettingsSkeleton'

function SectionHeading({ width = 'w-32' }: { width?: string }) {
    return (
        <div className="mb-4 flex items-center gap-2">
            <SkeletonBar className="h-8 w-8 rounded-lg" />
            <SkeletonBar className={`h-4 ${width}`} />
        </div>
    )
}

export default function GymProfileLoading() {
    return (
        <SettingsSkeletonShell>
            <SettingsPlainHeaderSkeleton titleWidth="w-40" />

            <SkeletonCard className="rounded-xl">
                <SectionHeading width="w-40" />
                <div className="mb-5 flex items-center gap-4">
                    <SkeletonBar className="h-16 w-16 shrink-0 rounded-full" />
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <SkeletonBar className="h-10 w-32 rounded-xl" />
                            <SkeletonBar className="h-10 w-28 rounded-xl" />
                        </div>
                        <SkeletonBar className="h-3 w-48" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SkeletonFieldRow labelWidth="w-24" className="md:col-span-2" />
                    <SkeletonFieldRow labelWidth="w-16" />
                    <SkeletonFieldRow labelWidth="w-16" />
                    <SkeletonFieldRow labelWidth="w-20" className="md:col-span-2" />
                </div>
            </SkeletonCard>

            <SkeletonCard className="rounded-xl">
                <SectionHeading width="w-24" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SkeletonFieldRow labelWidth="w-20" className="md:col-span-2" />
                    <SkeletonFieldRow labelWidth="w-12" />
                    <SkeletonFieldRow labelWidth="w-12" />
                    <SkeletonFieldRow labelWidth="w-24" />
                    <SkeletonFieldRow labelWidth="w-16" />
                </div>
            </SkeletonCard>

            <SkeletonCard className="rounded-xl">
                <SectionHeading width="w-24" />
                <div className="max-w-xs">
                    <SkeletonFieldRow labelWidth="w-16" />
                </div>
            </SkeletonCard>

            <SettingsSaveButtonSkeleton className="w-32" />
        </SettingsSkeletonShell>
    )
}

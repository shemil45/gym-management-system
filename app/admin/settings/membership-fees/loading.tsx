import {
    SettingsSkeletonShell,
    SettingsPlainHeaderSkeleton,
    SkeletonCard,
    SkeletonBar,
    SkeletonToggleRow,
    SettingsSaveButtonSkeleton,
} from '@/components/settings/SettingsSkeleton'

function SectionHeading() {
    return (
        <div className="mb-1 flex items-center gap-2">
            <SkeletonBar className="h-8 w-8 rounded-lg" />
            <SkeletonBar className="h-4 w-32" />
        </div>
    )
}

export default function MembershipFeesLoading() {
    return (
        <SettingsSkeletonShell>
            <SettingsPlainHeaderSkeleton titleWidth="w-64" />

            <SkeletonCard className="rounded-xl">
                <SectionHeading />
                <div className="max-w-xs space-y-1.5">
                    <SkeletonBar className="h-3 w-32" />
                    <SkeletonBar className="h-10 w-full" />
                    <SkeletonBar className="h-3 w-56" />
                </div>
            </SkeletonCard>

            <SkeletonCard className="rounded-xl">
                <SectionHeading />
                <SkeletonBar className="h-3 w-72" />
                <SkeletonToggleRow />
            </SkeletonCard>

            <SkeletonCard className="rounded-xl">
                <SectionHeading />
                <SkeletonToggleRow />
            </SkeletonCard>

            <SettingsSaveButtonSkeleton className="w-32" />
        </SettingsSkeletonShell>
    )
}

import { SettingsSkeletonShell, SettingsIconHeaderSkeleton, SkeletonBar } from '@/components/settings/SettingsSkeleton'

export default function CheckInAttendanceLoading() {
    return (
        <SettingsSkeletonShell>
            <SettingsIconHeaderSkeleton titleWidth="w-52" />
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-16 sm:py-20">
                <SkeletonBar className="h-12 w-12 rounded-full" />
                <SkeletonBar className="h-3.5 w-56" />
                <SkeletonBar className="h-3 w-72" />
            </div>
        </SettingsSkeletonShell>
    )
}

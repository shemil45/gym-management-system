import { SettingsSkeletonShell, SkeletonBar } from '@/components/settings/SettingsSkeleton'

const CATEGORY_CARD_COUNTS = [2, 2, 3, 1]

export default function SettingsHubLoading() {
    return (
        <SettingsSkeletonShell>
            <div className="space-y-3">
                <SkeletonBar className="h-8 w-32" />
                <SkeletonBar className="h-4 w-80" />
            </div>

            <div className="space-y-6">
                {CATEGORY_CARD_COUNTS.map((cardCount, categoryIndex) => (
                    <section key={categoryIndex}>
                        <SkeletonBar className="mb-3 h-3 w-20" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: cardCount }).map((_, cardIndex) => (
                                <div
                                    key={cardIndex}
                                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                                >
                                    <SkeletonBar className="h-9 w-9 shrink-0 rounded-xl" />
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <SkeletonBar className="h-3.5 w-24" />
                                        <SkeletonBar className="h-3 w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </SettingsSkeletonShell>
    )
}

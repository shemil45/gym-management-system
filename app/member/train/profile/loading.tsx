import { Skeleton } from '@/components/member/ui'

/**
 * Shaped like the questionnaire: intro line, then two cards of chip rows,
 * then the full-width submit. Having a boundary here means the Edit profile
 * tap paints immediately instead of waiting on the profile fetch.
 */
export default function TrainingProfileLoading() {
    return (
        <div className="mx-auto w-full max-w-[720px] px-5 lg:max-w-none lg:px-0">
            <div className="mb-4 flex items-center gap-1 lg:mb-6">
                <Skeleton className="h-8 w-44" />
            </div>
            <div className="flex flex-col gap-3.5">
                <Skeleton className="h-10 w-[80%]" />
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-[292px] rounded-[18px]" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-[332px] rounded-[18px]" />
                <Skeleton className="h-14 rounded-full" />
            </div>
        </div>
    )
}

import { Skeleton } from '@/components/member/ui'

/**
 * Shaped like a Train screen with a plan: status row, summary, day chips,
 * the session card, then the nutrition tiles. Also what the profile and
 * coach screens land on when going back.
 */
export default function TrainLoading() {
    return (
        <div className="mx-auto w-full max-w-[720px] px-5 lg:max-w-none lg:px-0">
            <div className="mb-4 flex items-center gap-1 lg:mb-6">
                <Skeleton className="h-8 w-24" />
            </div>
            <div className="flex flex-col gap-3.5">
                <Skeleton className="h-[60px]" />
                <Skeleton className="h-10 w-[85%]" />
                <div className="flex gap-2 overflow-hidden">
                    <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
                    <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
                    <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
                    <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
                </div>
                <Skeleton className="h-[320px] rounded-[18px]" />
                <Skeleton className="h-6 w-24" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Skeleton className="h-[92px]" />
                    <Skeleton className="h-[92px]" />
                    <Skeleton className="h-[92px]" />
                    <Skeleton className="h-[92px]" />
                </div>
            </div>
        </div>
    )
}

import { Skeleton } from '@/components/member/ui'

/**
 * Skeleton mirrors the Home layout: status card, week strip, then list rows.
 * Same shapes, same gaps, so nothing shifts when the real content lands.
 */
export default function MemberLoading() {
    return (
        <div className="mx-auto w-full max-w-[720px] px-5 lg:max-w-none lg:px-0">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <div className="flex flex-col gap-3.5">
                    <Skeleton className="h-[214px] rounded-[24px]" />
                    <Skeleton className="h-[148px] rounded-[24px]" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-[224px] rounded-[24px]" />
                </div>
                <div className="mt-3.5 hidden flex-col gap-3.5 lg:flex lg:mt-0">
                    <Skeleton className="h-[248px] rounded-[24px]" />
                    <Skeleton className="h-[116px] rounded-[24px]" />
                </div>
            </div>
        </div>
    )
}

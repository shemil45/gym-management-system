import { Skeleton } from '@/components/member/ui'

/**
 * This boundary covers every member route, so the shape is deliberately
 * generic: a lead card followed by list rows. Mimicking Home specifically
 * meant Payments and Activity flashed a layout they never resolve into.
 */
export default function MemberLoading() {
    return (
        <div className="mx-auto w-full max-w-[720px] px-5 lg:max-w-none lg:px-0">
            <Skeleton className="mb-6 hidden h-8 w-48 lg:block" />
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
                <div className="flex flex-col gap-3.5">
                    <Skeleton className="h-[168px] rounded-[24px]" />
                    <Skeleton className="h-[132px] rounded-[24px]" />
                    <Skeleton className="h-[196px] rounded-[24px]" />
                </div>
                <div className="mt-3.5 hidden flex-col gap-3.5 lg:mt-0 lg:flex">
                    <Skeleton className="h-[224px] rounded-[24px]" />
                </div>
            </div>
        </div>
    )
}

import { Skeleton } from '@/components/member/ui'

/**
 * Shaped like a short thread: the note line under the title, a few
 * alternating bubbles, and the pinned composer. Paints the moment Open is
 * tapped, before the chat history has been read.
 */
export default function CoachLoading() {
    return (
        <div className="mx-auto w-full max-w-[720px] px-5 pb-24 lg:max-w-none lg:px-0 lg:pb-28">
            <div className="mb-4 flex items-center gap-1 lg:mb-6">
                <Skeleton className="h-8 w-28" />
            </div>
            <Skeleton className="mb-4 h-5 w-56" />
            <div className="flex flex-col gap-2.5">
                <Skeleton className="h-12 w-[62%] self-end rounded-[18px] rounded-br-[6px]" />
                <Skeleton className="h-[88px] w-[78%] rounded-[18px] rounded-bl-[6px]" />
                <Skeleton className="h-12 w-[48%] self-end rounded-[18px] rounded-br-[6px]" />
                <Skeleton className="h-[64px] w-[70%] rounded-[18px] rounded-bl-[6px]" />
            </div>
            <div className="m-confirmbar z-30 border-t border-[var(--m-line)] bg-[var(--m-bg)]/90 px-5 py-3 backdrop-blur-xl lg:mx-0 lg:rounded-[var(--m-r-core)] lg:border">
                <div className="mx-auto flex w-full max-w-[720px] items-end gap-2 lg:max-w-none">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 w-12 rounded-full" />
                </div>
            </div>
        </div>
    )
}

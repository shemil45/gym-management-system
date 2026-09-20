export default function Loading() {
    return (
        <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded-md bg-gray-200 dark:bg-neutral-800" />
            <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-gray-200 dark:bg-neutral-800" />
            <div className="h-72 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-neutral-800" />
        </div>
    )
}

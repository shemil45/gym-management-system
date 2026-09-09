/**
 * Shown while the tenants route runs its aggregate query.
 *
 * The route is force-dynamic, so before this existed a slow query left the
 * portal shell sitting on the previous page with no sign a click had landed.
 * The shape mirrors the real layout, tiles then toolbar then rows, so the
 * arriving page settles into the same boxes instead of replacing a different
 * silhouette.
 */
export default function TenantsLoading() {
    return (
        <div className="p-rise flex flex-col gap-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading tenants</span>

            <div className="h-[26px] w-[92px] p-skeleton" />

            <div className="p-panel overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-[var(--p-line-soft)] sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div
                            key={index}
                            className={
                                index === 4
                                    ? 'col-span-2 bg-[var(--p-surface)] px-4 py-3.5 sm:col-span-1'
                                    : 'bg-[var(--p-surface)] px-4 py-3.5'
                            }
                        >
                            <div className="h-[9px] w-[58px] p-skeleton" />
                            <div className="mt-2.5 h-[22px] w-[46px] p-skeleton" />
                            <div className="mt-2.5 h-[9px] w-[76px] p-skeleton" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-panel overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-[var(--p-line)] p-3 lg:flex-row lg:items-center">
                    <div className="h-[38px] w-[326px] max-w-full p-skeleton" />
                    <div className="h-[38px] w-full p-skeleton lg:ml-auto lg:max-w-[360px]" />
                </div>

                <div className="border-b border-[var(--p-line-soft)] px-4 py-2.5">
                    <div className="h-[9px] w-[104px] p-skeleton" />
                </div>

                {/* Eight placeholder rows: enough to read as a table, few
                    enough that the skeleton is never taller than the content
                    replacing it on a short directory. */}
                <div className="flex flex-col gap-px bg-[var(--p-line-soft)]">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 bg-[var(--p-surface)] px-4 py-3"
                        >
                            <div className="h-[30px] w-[30px] shrink-0 rounded-[var(--p-r-control)] p-skeleton" />
                            <div className="min-w-0 flex-1">
                                <div className="h-[11px] w-[42%] max-w-[190px] p-skeleton" />
                                <div className="mt-1.5 h-[9px] w-[28%] max-w-[140px] p-skeleton" />
                            </div>
                            <div className="hidden h-[21px] w-[62px] shrink-0 rounded-full p-skeleton sm:block" />
                            <div className="hidden h-[11px] w-[52px] shrink-0 p-skeleton lg:block" />
                            <div className="hidden h-[11px] w-[38px] shrink-0 p-skeleton lg:block" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

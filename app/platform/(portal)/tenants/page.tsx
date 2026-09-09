import { getTenantSummaries } from '@/lib/platform/data'
import TenantsDirectory from './TenantsClient'

export const metadata = { title: 'Tenants' }
export const dynamic = 'force-dynamic'

export default async function TenantsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
    const { q = '', status = 'all', page } = await searchParams

    // A shared link may carry any page number, including one this directory
    // no longer has. Only the obviously invalid shapes are rejected here; the
    // client clamps the rest against the real page count once it has filtered.
    const requestedPage = Number.parseInt(page ?? '1', 10)
    const initialPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1

    // The whole directory is fetched once and filtered in the browser. It used
    // to be filtered here, which made every status tab a navigation back into
    // this force-dynamic route: the aggregate query ran again on each click
    // and the tab took a full round trip to visibly change. The URL is still
    // read here so a shared or refreshed link opens on the right filter.
    const tenants = await getTenantSummaries()

    return (
        <div className="p-rise">
            <TenantsDirectory
                tenants={tenants}
                initialStatus={status}
                initialQuery={q}
                initialPage={initialPage}
            />
        </div>
    )
}

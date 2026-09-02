import { getTenantSummaries } from '@/lib/platform/data'
import TenantsDirectory from './TenantsClient'

export const metadata = { title: 'Tenants' }
export const dynamic = 'force-dynamic'

export default async function TenantsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; status?: string }>
}) {
    const { q = '', status = 'all' } = await searchParams

    // The whole directory is fetched once and filtered in the browser. It used
    // to be filtered here, which made every status tab a navigation back into
    // this force-dynamic route: the aggregate query ran again on each click
    // and the tab took a full round trip to visibly change. The URL is still
    // read here so a shared or refreshed link opens on the right filter.
    const tenants = await getTenantSummaries()

    return (
        <div className="p-rise">
            <TenantsDirectory tenants={tenants} initialStatus={status} initialQuery={q} />
        </div>
    )
}

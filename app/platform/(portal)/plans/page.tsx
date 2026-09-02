import { getPlanCatalog } from '@/lib/platform/data'
import { getPlatformSession, roleCan } from '@/lib/platform/auth'
import PlansManager from './PlansClient'

export const metadata = { title: 'Plans' }
export const dynamic = 'force-dynamic'

export default async function PlansPage() {
    const [{ plans, features }, session] = await Promise.all([getPlanCatalog(), getPlatformSession()])

    const canWrite = session.admin ? roleCan(session.admin.role, 'billing:write') : false

    // The empty state lives in the client component alongside the create
    // dialog it opens, so an operator with nothing defined yet gets the same
    // "New plan" affordance the populated page has rather than a dead panel.
    return (
        <div className="p-rise">
            <PlansManager plans={plans} features={features} canWrite={canWrite} />
        </div>
    )
}

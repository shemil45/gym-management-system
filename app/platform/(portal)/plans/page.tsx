import { getPlanCatalog } from '@/lib/platform/data'
import { getPlatformSession, roleCan } from '@/lib/platform/auth'
import { EmptyState, Panel } from '@/components/platform/ui'
import PlansManager from './PlansClient'

export const metadata = { title: 'Plans' }
export const dynamic = 'force-dynamic'

export default async function PlansPage() {
    const [{ plans, features }, session] = await Promise.all([getPlanCatalog(), getPlatformSession()])

    const canWrite = session.admin ? roleCan(session.admin.role, 'billing:write') : false

    return (
        <div className="p-rise flex flex-col">
            <PlansManager plans={plans} features={features} canWrite={canWrite} />

            {plans.length === 0 ? (
                <Panel padded={false}>
                    <EmptyState
                        title="No plans defined"
                        description="Create a tier to start assigning tenants to it. Until one exists, signups land with no plan and the fallback trial window."
                    />
                </Panel>
            ) : null}
        </div>
    )
}

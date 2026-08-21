import { redirect } from 'next/navigation'
import { getMemberPortalData } from '@/lib/member/portal-data'
import RenewClient from './RenewClient'

export const metadata = { title: 'Renew plan' }

export default async function RenewPage() {
    const data = await getMemberPortalData()
    if (!data) redirect('/member')

    return (
        <RenewClient
            plans={data.plans}
            currentPlanName={data.membership.planName}
            credits={data.credits}
        />
    )
}

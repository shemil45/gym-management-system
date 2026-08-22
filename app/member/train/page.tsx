import { IconBarbell } from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { EmptyState, LinkButton, Screen } from '@/components/member/ui'
import TrainClient from './TrainClient'

export const metadata = { title: 'Train' }

export default async function TrainPage() {
    const data = await getMemberPortalData()

    if (!data) {
        return (
            <Screen title="Training">
                <EmptyState
                    icon={<IconBarbell size={26} stroke={1.6} />}
                    title="Nothing to show yet"
                    body="Your account is not linked to a member record, so training plans cannot be loaded."
                    action={
                        <LinkButton href="/member/support" tone="primary">
                            Contact the gym
                        </LinkButton>
                    }
                />
            </Screen>
        )
    }

    return <TrainClient training={data.training} />
}

import { IconQrcode } from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { EmptyState, LinkButton, Screen } from '@/components/member/ui'
import PassClient from './PassClient'

export const metadata = { title: 'Gym pass' }

export default async function PassPage() {
    const data = await getMemberPortalData()

    if (!data) {
        return (
            <Screen>
                <EmptyState
                    icon={<IconQrcode size={26} stroke={1.6} />}
                    title="No pass available"
                    body="Your account is not linked to a member record yet, so there is nothing to scan at the door."
                    action={
                        <LinkButton href="/member/support" tone="primary">
                            Contact the gym
                        </LinkButton>
                    }
                />
            </Screen>
        )
    }

    return (
        <PassClient
            memberCode={data.member.memberCode}
            memberName={data.member.fullName}
            gymName={data.gym.name}
            planName={data.membership.planName}
            state={data.membership.state}
        />
    )
}

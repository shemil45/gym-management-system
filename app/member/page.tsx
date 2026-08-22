import { IconUserQuestion } from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { HomeScreen } from '@/components/member/HomeScreen'
import { greetingFor } from '@/lib/member/greeting'
import { EmptyState, LinkButton, Screen } from '@/components/member/ui'

export default async function MemberHome() {
    const data = await getMemberPortalData()

    if (!data) {
        return (
            <Screen>
                <EmptyState
                    icon={<IconUserQuestion size={26} stroke={1.6} />}
                    title="We could not find your membership"
                    body="Your account is signed in but is not linked to a member record yet. The front desk can connect it in a minute."
                    action={
                        <LinkButton href="/member/support" tone="primary">
                            Contact the gym
                        </LinkButton>
                    }
                />
            </Screen>
        )
    }

    return <HomeScreen data={data} greeting={greetingFor(data.member.firstName)} />
}

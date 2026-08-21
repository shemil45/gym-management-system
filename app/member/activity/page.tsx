import { IconCalendarMonth } from '@tabler/icons-react'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { ActivityScreen } from '@/components/member/ActivityScreen'
import { EmptyState, LinkButton, Screen } from '@/components/member/ui'

export const metadata = { title: 'Activity' }

export default async function ActivityPage() {
    const data = await getMemberPortalData()

    if (!data) {
        return (
            <Screen title="Activity">
                <EmptyState
                    icon={<IconCalendarMonth size={26} stroke={1.6} />}
                    title="No activity to show"
                    body="Your account is not linked to a member record yet."
                    action={
                        <LinkButton href="/member/support" tone="primary">
                            Contact the gym
                        </LinkButton>
                    }
                />
            </Screen>
        )
    }

    return <ActivityScreen activity={data.activity} />
}

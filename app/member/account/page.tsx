import { getCurrentMemberContext } from '@/lib/auth/member-server'
import { getMemberPortalData } from '@/lib/member/portal-data'
import AccountClient from './AccountClient'

export const metadata = { title: 'Account' }

export default async function AccountPage() {
    const [data, context] = await Promise.all([
        getMemberPortalData(),
        getCurrentMemberContext(),
    ])

    return (
        <AccountClient
            name={data?.member.fullName ?? context.profile?.full_name ?? 'Member'}
            memberCode={data?.member.memberCode ?? 'Not assigned'}
            email={data?.member.email ?? context.user?.email ?? null}
            phone={data?.member.phone ?? null}
            photoUrl={data?.member.photoUrl ?? context.profile?.photo_url ?? null}
            joinedAt={data?.member.joinedAt ?? null}
            credits={data?.credits ?? 0}
        />
    )
}

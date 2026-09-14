import { redirect } from 'next/navigation'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { getChatHistory } from '@/app/member/ai-trainer/actions'
import CoachClient from './CoachClient'

export const metadata = { title: 'Coach' }

export default async function CoachPage() {
    const data = await getMemberPortalData()
    if (!data || !data.aiTrainerEnabled) redirect('/member/train')

    const history = await getChatHistory()

    return (
        <CoachClient
            firstName={data.member.firstName}
            hasProfile={data.training.hasProfile}
            initial={history.map((row, i) => ({
                id: `h-${i}`,
                role: row.role === 'model' ? 'model' : 'user',
                content: row.content,
            }))}
        />
    )
}

import { redirect } from 'next/navigation'
import { getMemberPortalData } from '@/lib/member/portal-data'
import { getFitnessProfile } from '@/app/member/fitness-profile/actions'
import ProfileForm, { type FitnessProfileValues } from './ProfileForm'

export const metadata = { title: 'Training profile' }

export default async function TrainingProfilePage() {
    const data = await getMemberPortalData()
    if (!data || !data.aiTrainerEnabled) redirect('/member/train')

    const profile = (await getFitnessProfile()) as Partial<FitnessProfileValues> | null

    return <ProfileForm initial={profile} hasPlan={data.training.hasPlan} />
}

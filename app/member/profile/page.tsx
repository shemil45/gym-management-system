import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMemberPortalData } from '@/lib/member/portal-data'
import ProfileClient from './ProfileClient'

export const metadata = { title: 'Profile' }

export default async function ProfilePage() {
    const data = await getMemberPortalData()
    if (!data) redirect('/member')

    const supabase = await createClient()
    const { data: extra } = (await supabase
        .from('members')
        .select('address, emergency_contact_name, emergency_contact_phone')
        .eq('id', data.member.id)
        .maybeSingle()) as {
        data: {
            address: string | null
            emergency_contact_name: string | null
            emergency_contact_phone: string | null
        } | null
    }

    return (
        <ProfileClient
            member={{
                fullName: data.member.fullName,
                memberCode: data.member.memberCode,
                email: data.member.email,
                phone: data.member.phone,
                address: extra?.address ?? null,
                emergencyName: extra?.emergency_contact_name ?? null,
                emergencyPhone: extra?.emergency_contact_phone ?? null,
                planName: data.membership.planName,
            }}
        />
    )
}

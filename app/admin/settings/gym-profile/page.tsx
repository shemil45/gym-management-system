import { redirect } from 'next/navigation'
import GymProfileSettings from '@/components/settings/GymProfileSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type GymProfileFields = Pick<Tables<'gyms'>,
    'name' | 'logo_url' | 'contact_phone' | 'contact_email' | 'website' |
    'address' | 'city' | 'state' | 'postal_code' | 'country' | 'gstin'>

export default async function GymProfileSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('name, logo_url, contact_phone, contact_email, website, address, city, state, postal_code, country, gstin')
        .eq('id', gym.id)
        .single()
    const { data: gymProfile } = gymResult as unknown as QueryResult<GymProfileFields | null>

    return (
        <GymProfileSettings
            gym={{
                name: gymProfile?.name ?? gym.name,
                logo_url: gymProfile?.logo_url ?? null,
                contact_phone: gymProfile?.contact_phone ?? null,
                contact_email: gymProfile?.contact_email ?? null,
                website: gymProfile?.website ?? null,
                address: gymProfile?.address ?? null,
                city: gymProfile?.city ?? null,
                state: gymProfile?.state ?? null,
                postal_code: gymProfile?.postal_code ?? null,
                country: gymProfile?.country ?? null,
                gstin: gymProfile?.gstin ?? null,
            }}
        />
    )
}

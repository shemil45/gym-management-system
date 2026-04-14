import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import StaffDirectory from '@/components/staff/StaffDirectory'
import type { StaffRole } from '@/lib/auth/roles'

type StaffDirectoryRow = {
    user_id: string
    role: StaffRole
    profile: {
        id: string
        full_name: string
        phone: string | null
        photo_url: string | null
    } | null
}

export default async function StaffPage() {
    const supabase = await createClient()

    const staffResult = await supabase
        .from('admins')
        .select('user_id, role, profile:profiles!admins_user_id_fkey(id, full_name, phone, photo_url)')
        .order('created_at', { ascending: false })

    const { data: rows } = staffResult as unknown as QueryResult<StaffDirectoryRow[] | null>
    const staff = (rows ?? []).flatMap((row) => {
        if (!row.profile) {
            return []
        }

        return [{
            id: row.user_id,
            full_name: row.profile.full_name,
            role: row.role,
            phone: row.profile.phone,
            photo_url: row.profile.photo_url,
        }]
    })

    return <StaffDirectory staff={staff} />
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditStaffForm from '@/components/staff/EditStaffForm'
import type { StaffRole } from '@/lib/auth/roles'
import type { QueryResult } from '@/lib/types'

type EditableStaff = {
    user_id: string
    role: StaffRole
    profile: {
        id: string
        full_name: string
        phone: string | null
        photo_url: string | null
    } | null
}

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const staffResult = await supabase
        .from('admins')
        .select('user_id, role, profile:profiles!admins_user_id_fkey(id, full_name, phone, photo_url)')
        .eq('user_id', id)
        .maybeSingle()
    const { data: staff } = staffResult as unknown as QueryResult<EditableStaff | null>

    if (!staff?.profile) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Staff</h1>
                <p className="mt-1 text-sm text-gray-500">Update staff details and role information for this gym.</p>
            </div>
            <EditStaffForm
                staff={{
                    id: staff.user_id,
                    full_name: staff.profile.full_name,
                    phone: staff.profile.phone,
                    photo_url: staff.profile.photo_url,
                    role: staff.role,
                }}
            />
        </div>
    )
}

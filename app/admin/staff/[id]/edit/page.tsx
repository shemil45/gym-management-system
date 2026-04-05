import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditStaffForm from '@/components/staff/EditStaffForm'
import type { StaffRole } from '@/lib/auth/roles'

type EditableStaff = {
    id: string
    full_name: string
    phone: string | null
    photo_url: string | null
    role: StaffRole
}

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const result = await supabase
        .from('profiles')
        .select('id, full_name, phone, photo_url, role')
        .eq('id', id)
        .neq('role', 'member')
        .single()

    const staff = result.data as EditableStaff | null

    if (!staff) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Staff</h1>
                <p className="mt-1 text-sm text-gray-500">Update staff details and role information.</p>
            </div>
            <EditStaffForm staff={staff} />
        </div>
    )
}

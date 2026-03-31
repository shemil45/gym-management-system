import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditMemberForm from '@/components/forms/EditMemberForm'

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const [{ data: member }, { data: plans }] = await Promise.all([
        supabase
            .from('members')
            .select(`
                id,
                full_name,
                email,
                phone,
                photo_url,
                date_of_birth,
                gender,
                address,
                emergency_contact_name,
                emergency_contact_phone,
                membership_plan_id,
                membership_start_date,
                status
            `)
            .eq('id', id)
            .single(),
        supabase
            .from('membership_plans')
            .select('id, name')
            .order('name'),
    ])

    if (!member) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Member</h1>
                <p className="text-sm text-gray-500 mt-1">Update member details and membership information.</p>
            </div>
            <EditMemberForm member={member} plans={plans || []} />
        </div>
    )
}

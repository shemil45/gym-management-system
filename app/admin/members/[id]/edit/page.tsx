import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditMemberForm from '@/components/forms/EditMemberForm'

type EditableMember = {
    id: string
    full_name: string
    email: string | null
    phone: string
    photo_url: string | null
    date_of_birth: string | null
    gender: 'male' | 'female' | 'other' | null
    address: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    membership_plan_id: string | null
    membership_start_date: string | null
    status: string
}

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const [memberResult, plansResult] = await Promise.all([
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

    const { data: member } = memberResult as unknown as { data: EditableMember | null; error: unknown }
    const { data: plans } = plansResult

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

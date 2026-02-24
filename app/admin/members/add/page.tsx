import { createClient } from '@/lib/supabase/server'
import AddMemberForm from '@/components/forms/AddMemberForm'

export default async function AddMemberPage() {
    const supabase = await createClient()

    // Fetch all membership plans
    const { data: plans, error } = await supabase
        .from('membership_plans')
        .select('id, name, duration_days, price')
        .order('price')

    console.log('Fetched plans:', plans, 'Error:', error)

    return <AddMemberForm plans={plans || []} />
}

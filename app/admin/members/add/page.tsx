import { createClient } from '@/lib/supabase/server'
import AddMemberForm from '@/components/forms/AddMemberForm'

export default async function AddMemberPage() {
    const supabase = await createClient()

    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name, duration_days, price')
        .order('price')

    return <AddMemberForm plans={plans || []} />
}

import { createClient } from '@/lib/supabase/server'
import MembersTable from '@/components/tables/MembersTable'

export default async function MembersPage() {
    const supabase = await createClient()

    // Fetch members with their membership plans
    const { data: members } = await supabase
        .from('members')
        .select(`
      *,
      membership_plan:membership_plans(id, name)
    `)
        .order('created_at', { ascending: false })

    // Fetch all plans for filter dropdown
    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name')
        .order('name')

    return (
        <MembersTable
            members={members || []}
            plans={plans || []}
        />
    )
}

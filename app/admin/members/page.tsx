import { createClient } from '@/lib/supabase/server'
import MembersTable from '@/components/tables/MembersTable'

type MembersPageProps = {
    searchParams: Promise<{
        status?: string
        planExpiry?: string
        filter?: string
    }>
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
    const params = await searchParams
    const supabase = await createClient()

    // Fetch members with their membership plans
    const { data: members } = await supabase
        .from('members')
        .select(`
      *,
      membership_plan:membership_plans(id, name, price)
    `)
        .order('created_at', { ascending: false })

    // Fetch all plans for filter dropdown
    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name')
        .order('name')

    return (
        <MembersTable
            key={`${params.status || 'all'}:${params.planExpiry || 'none'}:${params.filter || 'none'}`}
            members={members || []}
            plans={plans || []}
            initialFilters={{
                status: params.status,
                planExpiry: params.planExpiry,
                filter: params.filter,
            }}
        />
    )
}

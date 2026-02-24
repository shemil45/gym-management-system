import { createClient } from '@/lib/supabase/server'
import CheckInsTable from '@/components/tables/CheckInsTable'

export default async function CheckInsPage() {
    const supabase = await createClient()

    // Fetch check-ins joined with member + plan data, most recent first
    const { data: checkIns } = await supabase
        .from('check_ins')
        .select(`
            *,
            member:members(
                id,
                member_id,
                full_name,
                photo_url,
                status,
                membership_plan:membership_plans(name)
            )
        `)
        .order('check_in_time', { ascending: false })
        .limit(500)

    // Active members for the manual check-in dropdown
    const { data: activeMembers } = await supabase
        .from('members')
        .select('id, member_id, full_name, photo_url, status')
        .eq('status', 'active')
        .order('full_name')

    return (
        <CheckInsTable
            checkIns={checkIns || []}
            activeMembers={activeMembers || []}
        />
    )
}

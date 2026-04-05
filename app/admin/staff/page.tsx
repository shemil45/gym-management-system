import { createClient } from '@/lib/supabase/server'
import StaffDirectory from '@/components/staff/StaffDirectory'

export default async function StaffPage() {
    const supabase = await createClient()

    const { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone, photo_url')
        .neq('role', 'member')
        .order('created_at', { ascending: false })

    return <StaffDirectory staff={staff || []} />
}

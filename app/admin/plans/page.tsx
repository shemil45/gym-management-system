import { createClient } from '@/lib/supabase/server'
import PlansManager from '@/components/plans/PlansManager'

export default async function PlansPage() {
    const supabase = await createClient()

    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name, price, duration_days, description, is_active')
        .order('price', { ascending: true })

    return <PlansManager plans={plans || []} />
}

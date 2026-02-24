import { createClient } from '@/lib/supabase/server'
import PlansManager from '@/components/plans/PlansManager'

export default async function PlansPage() {
    const supabase = await createClient()

    const { data: plans } = await supabase
        .from('membership_plans')
        .select('*')
        .order('price', { ascending: true })

    return <PlansManager plans={plans || []} />
}

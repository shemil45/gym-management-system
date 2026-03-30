import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlansClient from './PlansClient'

export default async function PlansPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get current member record
    const { data: member } = await supabase
        .from('members')
        .select('id, membership_plan_id, membership_expiry_date, status, referral_coins_balance')
        .eq('user_id', user.id)
        .single() as any

    // Get all active plans
    const { data: plans } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true }) as any

    return (
        <PlansClient
            plans={plans || []}
            currentPlanId={member?.membership_plan_id ?? null}
            membershipExpiry={member?.membership_expiry_date ?? null}
            memberStatus={member?.status ?? 'inactive'}
            referralCoinsBalance={member?.referral_coins_balance ?? 0}
        />
    )
}
